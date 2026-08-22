import { setTimeout as delay } from 'timers/promises';
import pg from 'pg';
import { BackfillBatchResult, backfills } from './backfills/registry';

type BackfillConfig = Readonly<{
  name: string;
  batchSize: number;
  throttleMs: number;
  maxBatches?: number;
}>;

function boundedInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number
) {
  const parsed = value === undefined ? defaultValue : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return parsed;
}

export function readBackfillConfig(
  env: NodeJS.ProcessEnv = process.env
): BackfillConfig {
  const name = env.BACKFILL_NAME?.trim();
  if (!name) throw new Error('BACKFILL_NAME is required');
  const maxBatches = env.BACKFILL_MAX_BATCHES
    ? boundedInteger(
        'BACKFILL_MAX_BATCHES',
        env.BACKFILL_MAX_BATCHES,
        1,
        1,
        1_000_000
      )
    : undefined;
  return {
    name,
    batchSize: boundedInteger(
      'BACKFILL_BATCH_SIZE',
      env.BACKFILL_BATCH_SIZE,
      500,
      1,
      10_000
    ),
    throttleMs: boundedInteger(
      'BACKFILL_THROTTLE_MS',
      env.BACKFILL_THROTTLE_MS,
      250,
      0,
      60_000
    ),
    maxBatches,
  };
}

export function assertBackfillProgress(
  cursor: Record<string, unknown> | null,
  result: BackfillBatchResult
): void {
  if (!Number.isInteger(result.processed) || result.processed < 0) {
    throw new Error('Backfill returned an invalid processed count');
  }
  if (!result.done && result.nextCursor === null) {
    throw new Error(
      'Backfill must return a stable cursor until it is complete'
    );
  }
  if (
    !result.done &&
    JSON.stringify(result.nextCursor) === JSON.stringify(cursor)
  ) {
    throw new Error('Backfill did not advance its stable cursor');
  }
}

export function shouldPersistBackfillFailure(
  locked: boolean,
  attemptStarted: boolean
): boolean {
  return locked && attemptStarted;
}

async function main() {
  const config = readBackfillConfig();
  const definition = backfills[config.name];
  if (!definition) throw new Error(`Unknown backfill: ${config.name}`);
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10_000,
  });
  const control = await pool.connect();
  let locked = false;
  let attemptStarted = false;
  let stopRequested = false;
  const requestStop = () => {
    stopRequested = true;
  };
  process.once('SIGINT', requestStop);
  process.once('SIGTERM', requestStop);
  try {
    await control.query(`
      CREATE TABLE IF NOT EXISTS "_deployment_backfill_runs" (
        "name" TEXT PRIMARY KEY,
        "cursor" JSONB,
        "processedRows" BIGINT NOT NULL DEFAULT 0,
        "completedBatches" INTEGER NOT NULL DEFAULT 0,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL,
        "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMPTZ,
        "lastError" TEXT
      )
    `);
    const lock = await control.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
      [`backfill:${config.name}`]
    );
    locked = lock.rows[0]?.acquired === true;
    if (!locked) {
      console.error(
        JSON.stringify({
          event: 'backfill.blocked_locked',
          name: config.name,
          error: `Backfill ${config.name} is already running`,
        })
      );
      process.exitCode = 1;
      return;
    }
    await control.query(
      `INSERT INTO "_deployment_backfill_runs" ("name", "status", "attempts")
       VALUES ($1, 'RUNNING', 1)
       ON CONFLICT ("name") DO UPDATE SET
         "status" = CASE
           WHEN "_deployment_backfill_runs"."status" = 'SUCCEEDED' THEN 'SUCCEEDED'
           ELSE 'RUNNING'
         END,
         "attempts" = "_deployment_backfill_runs"."attempts" + 1,
         "updatedAt" = CURRENT_TIMESTAMP, "lastError" = NULL`,
      [config.name]
    );
    attemptStarted = true;
    const state = await control.query<{
      cursor: Record<string, unknown> | null;
      processedRows: string;
      completedBatches: number;
      status: string;
    }>(
      `SELECT "cursor", "processedRows", "completedBatches", "status"
       FROM "_deployment_backfill_runs" WHERE "name" = $1`,
      [config.name]
    );
    if (state.rows[0]?.status === 'SUCCEEDED') {
      console.info(
        JSON.stringify({
          event: 'backfill.already_complete',
          name: config.name,
        })
      );
      return;
    }
    let cursor = state.rows[0]?.cursor ?? null;
    let processedRows = BigInt(state.rows[0]?.processedRows ?? 0);
    let completedBatches = state.rows[0]?.completedBatches ?? 0;
    let batchesThisRun = 0;

    while (!stopRequested) {
      const worker = await pool.connect();
      try {
        await worker.query('BEGIN');
        const result = await definition.runBatch({
          client: worker,
          cursor,
          batchSize: config.batchSize,
        });
        assertBackfillProgress(cursor, result);
        cursor = result.nextCursor;
        processedRows += BigInt(result.processed);
        completedBatches += 1;
        batchesThisRun += 1;
        await worker.query(
          `UPDATE "_deployment_backfill_runs" SET
             "cursor" = $2::jsonb, "processedRows" = $3,
             "completedBatches" = $4, "status" = $5,
             "updatedAt" = CURRENT_TIMESTAMP,
             "completedAt" = CASE WHEN $5 = 'SUCCEEDED' THEN CURRENT_TIMESTAMP ELSE NULL END
           WHERE "name" = $1`,
          [
            config.name,
            JSON.stringify(cursor),
            processedRows.toString(),
            completedBatches,
            result.done ? 'SUCCEEDED' : 'RUNNING',
          ]
        );
        await worker.query('COMMIT');
        console.info(
          JSON.stringify({
            event: 'backfill.batch',
            name: config.name,
            processed: result.processed,
            processedRows: processedRows.toString(),
            completedBatches,
            cursor,
            done: result.done,
          })
        );
        if (result.done) return;
      } catch (error) {
        await worker.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        worker.release();
      }
      if (config.maxBatches && batchesThisRun >= config.maxBatches) {
        stopRequested = true;
      } else if (config.throttleMs > 0) {
        await delay(config.throttleMs);
      }
    }
    await control.query(
      `UPDATE "_deployment_backfill_runs"
       SET "status" = 'PAUSED', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "name" = $1 AND "status" = 'RUNNING'`,
      [config.name]
    );
    console.info(
      JSON.stringify({ event: 'backfill.paused', name: config.name })
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (shouldPersistBackfillFailure(locked, attemptStarted)) {
      await control
        .query(
          `UPDATE "_deployment_backfill_runs"
           SET "status" = 'FAILED', "updatedAt" = CURRENT_TIMESTAMP, "lastError" = $2
           WHERE "name" = $1`,
          [config.name, message.slice(0, 2000)]
        )
        .catch(() => undefined);
    }
    console.error(
      JSON.stringify({
        event: 'backfill.failed',
        name: config.name,
        error: message,
      })
    );
    process.exitCode = 1;
  } finally {
    if (locked) {
      await control
        .query('SELECT pg_advisory_unlock(hashtext($1))', [
          `backfill:${config.name}`,
        ])
        .catch(() => undefined);
    }
    control.release();
    await pool.end();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        event: 'backfill.bootstrap_failed',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    process.exitCode = 1;
  });
}

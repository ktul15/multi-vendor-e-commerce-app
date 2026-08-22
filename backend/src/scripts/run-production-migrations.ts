import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import pg from 'pg';
import {
  assertContractWindow,
  createStagingAttestation,
  loadPendingMigrations,
  readMigrationContext,
  readMigrationIdentity,
  verifyStagingAttestation,
} from './migration-safety';

const LOCK_NAMESPACE = 137;
const LOCK_KEY = 20260819;

const auditTableSql = `
  CREATE TABLE IF NOT EXISTS "_deployment_migration_runs" (
    "id" UUID PRIMARY KEY,
    "environment" TEXT NOT NULL,
    "releaseSha" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "changeTicket" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "backupId" TEXT,
    "pitrVerifiedAt" TIMESTAMPTZ,
    "restoreDrillId" TEXT,
    "restoreDrillVerifiedAt" TIMESTAMPTZ,
    "stagingEvidence" TEXT,
    "pendingMigrations" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ,
    "errorMessage" TEXT
  )
`;

function runPrismaDeploy(): Promise<void> {
  const executable = path.resolve(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma'
  );
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['migrate', 'deploy'], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(new Error(`prisma migrate deploy failed (${code ?? signal})`));
    });
  });
}

async function appliedMigrations(
  client: pg.Client
): Promise<Map<string, string>> {
  const relation = await client.query<{ name: string | null }>(
    `SELECT to_regclass('public._prisma_migrations')::text AS name`
  );
  if (!relation.rows[0]?.name) return new Map();
  const applied = await client.query<{
    migration_name: string;
    checksum: string;
  }>(
    `SELECT migration_name, checksum FROM "_prisma_migrations"
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
  );
  return new Map(
    applied.rows.map((row) => [row.migration_name, row.checksum] as const)
  );
}

async function writeEvidence(
  filePath: string | undefined,
  evidence: Record<string, unknown>
) {
  if (!filePath) return;
  await fs.writeFile(
    filePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );
}

async function main() {
  const identity = readMigrationIdentity();
  const evidencePath = process.env.MIGRATION_EVIDENCE_PATH;
  const signingKey = process.env.MIGRATION_EVIDENCE_SIGNING_KEY?.trim();
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
  });
  const runId = randomUUID();
  let locked = false;
  let auditCreated = false;
  let migrationApplied = false;
  let context: ReturnType<typeof readMigrationContext> | undefined;
  let pending: Awaited<ReturnType<typeof loadPendingMigrations>> = [];
  const startedAt = new Date();
  try {
    await client.connect();
    await client.query(auditTableSql);
    const lock = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS acquired',
      [LOCK_NAMESPACE, LOCK_KEY]
    );
    locked = lock.rows[0]?.acquired === true;
    if (locked) {
      await client.query(
        `UPDATE "_deployment_migration_runs"
         SET "status" = 'ABANDONED', "finishedAt" = CURRENT_TIMESTAMP,
             "errorMessage" = 'Runner ended without releasing its audit state; lock was no longer held'
         WHERE "status" IN ('PREPARING', 'RUNNING')`
      );
    }
    await client.query(
      `INSERT INTO "_deployment_migration_runs" (
        "id", "environment", "releaseSha", "actor", "changeTicket",
        "evidenceUrl", "backupId", "pitrVerifiedAt", "restoreDrillId",
        "restoreDrillVerifiedAt", "stagingEvidence", "status"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        runId,
        identity.environment,
        identity.releaseSha,
        identity.actor,
        identity.changeTicket,
        identity.evidenceUrl,
        null,
        null,
        null,
        null,
        null,
        locked ? 'PREPARING' : 'BLOCKED_LOCKED',
      ]
    );
    auditCreated = true;
    if (!locked)
      throw new Error('Another migration runner holds the database lock');

    context = readMigrationContext();
    pending = await loadPendingMigrations(
      path.resolve(process.cwd(), 'prisma', 'migrations'),
      await appliedMigrations(client)
    );
    assertContractWindow(pending);
    if (
      (identity.environment === 'production' || evidencePath) &&
      !signingKey
    ) {
      throw new Error('MIGRATION_EVIDENCE_SIGNING_KEY is required');
    }
    if (identity.environment === 'production') {
      verifyStagingAttestation(
        context.stagingEvidence!,
        identity.releaseSha,
        pending,
        signingKey!
      );
    }
    await client.query(
      `UPDATE "_deployment_migration_runs" SET
         "backupId" = $2, "pitrVerifiedAt" = $3,
         "restoreDrillId" = $4, "restoreDrillVerifiedAt" = $5,
         "stagingEvidence" = $6, "pendingMigrations" = $7::jsonb,
         "status" = 'RUNNING'
       WHERE "id" = $1`,
      [
        runId,
        context.backupId,
        context.pitrVerifiedAt,
        context.restoreDrillId,
        context.restoreDrillVerifiedAt,
        context.stagingEvidence,
        JSON.stringify(pending),
      ]
    );

    console.info(
      JSON.stringify({
        event: 'migration.started',
        runId,
        environment: identity.environment,
        releaseSha: identity.releaseSha,
        pending,
      })
    );
    await runPrismaDeploy();
    migrationApplied = true;
    const finishedAt = new Date();
    await client.query(
      `UPDATE "_deployment_migration_runs"
       SET "status" = 'SUCCEEDED', "finishedAt" = $2
       WHERE "id" = $1`,
      [runId, finishedAt]
    );
    const evidence = {
      runId,
      status: 'SUCCEEDED',
      environment: identity.environment,
      releaseSha: identity.releaseSha,
      changeTicket: identity.changeTicket,
      pending,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      stagingAttestation:
        identity.environment === 'staging' && signingKey
          ? createStagingAttestation(
              identity.releaseSha,
              pending,
              signingKey,
              runId,
              finishedAt
            )
          : undefined,
    };
    await writeEvidence(evidencePath, evidence);
    console.info(JSON.stringify({ event: 'migration.succeeded', ...evidence }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    const failureStatus = migrationApplied
      ? 'SUCCEEDED_EVIDENCE_FAILED'
      : 'FAILED';
    if (auditCreated) {
      await client
        .query(
          `UPDATE "_deployment_migration_runs"
           SET "status" = CASE WHEN "status" = 'BLOCKED_LOCKED' THEN "status" ELSE $5 END,
               "finishedAt" = $2, "errorMessage" = $3,
               "pendingMigrations" = $4::jsonb
           WHERE "id" = $1`,
          [
            runId,
            finishedAt,
            message.slice(0, 2000),
            JSON.stringify(pending),
            failureStatus,
          ]
        )
        .catch(() => undefined);
    }
    await writeEvidence(evidencePath, {
      runId,
      status: failureStatus,
      environment: identity.environment,
      releaseSha: identity.releaseSha,
      changeTicket: identity.changeTicket,
      pending,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      error: message,
    }).catch(() => undefined);
    console.error(
      JSON.stringify({
        event: 'migration.failed',
        runId,
        status: failureStatus,
        error: message,
      })
    );
    process.exitCode = 1;
  } finally {
    if (locked) {
      await client
        .query('SELECT pg_advisory_unlock($1, $2)', [LOCK_NAMESPACE, LOCK_KEY])
        .catch(() => undefined);
    }
    await client.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'migration.bootstrap_failed',
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exitCode = 1;
});

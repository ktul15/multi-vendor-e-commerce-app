import pg from 'pg';

export type BackfillBatchResult = Readonly<{
  processed: number;
  nextCursor: Record<string, unknown> | null;
  done: boolean;
}>;

export type BackfillDefinition = Readonly<{
  /**
   * A batch must be safe to execute again with the same cursor. Use stable
   * ordering plus conditional updates/upserts; never rely on offset paging.
   */
  runBatch: (input: {
    client: pg.PoolClient;
    cursor: Record<string, unknown> | null;
    batchSize: number;
  }) => Promise<BackfillBatchResult>;
}>;

// Backfills are registered in reviewed source code. Do not accept SQL or module
// paths from environment variables in a deployment job.
export const backfills: Readonly<Record<string, BackfillDefinition>> = {};

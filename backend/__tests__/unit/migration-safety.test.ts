import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  assertBackfillProgress,
  readBackfillConfig,
  shouldPersistBackfillFailure,
} from '../../src/scripts/run-backfill';
import {
  assertContractWindow,
  containsContraction,
  createStagingAttestation,
  loadPendingMigrations,
  readMigrationContext,
  verifyStagingAttestation,
} from '../../src/scripts/migration-safety';

const now = new Date('2026-08-19T00:00:00.000Z');

describe('rollout-safe database migrations', () => {
  it('requires current recovery and staging evidence for production', () => {
    expect(() =>
      readMigrationContext(
        {
          MIGRATION_ENVIRONMENT: 'production',
          MIGRATION_RELEASE_SHA: 'abcdef1234567890abcdef1234567890abcdef12',
          MIGRATION_ACTOR: 'operator',
          MIGRATION_CHANGE_TICKET: '#137',
          MIGRATION_BACKUP_ID: 'backup-42',
          MIGRATION_PITR_VERIFIED_AT: '2026-08-17T00:00:00.000Z',
          MIGRATION_RESTORE_DRILL_ID: 'drill-7',
          MIGRATION_RESTORE_DRILL_VERIFIED_AT: '2026-08-01T00:00:00.000Z',
          MIGRATION_STAGING_EVIDENCE: 'run-123',
        },
        now
      )
    ).toThrow(/PITR.*older/i);

    expect(
      readMigrationContext(
        {
          MIGRATION_ENVIRONMENT: 'production',
          MIGRATION_RELEASE_SHA: 'abcdef1234567890abcdef1234567890abcdef12',
          MIGRATION_ACTOR: 'operator',
          MIGRATION_CHANGE_TICKET: '#137',
          MIGRATION_BACKUP_ID: 'backup-42',
          MIGRATION_PITR_VERIFIED_AT: '2026-08-18T12:00:00.000Z',
          MIGRATION_RESTORE_DRILL_ID: 'drill-7',
          MIGRATION_RESTORE_DRILL_VERIFIED_AT: '2026-08-01T00:00:00.000Z',
          MIGRATION_STAGING_EVIDENCE: 'run-123',
        },
        now
      )
    ).toEqual(
      expect.objectContaining({
        environment: 'production',
        backupId: 'backup-42',
        stagingEvidence: 'run-123',
      })
    );
  });

  it('detects contraction SQL without matching comments', () => {
    expect(containsContraction('ALTER TABLE users DROP COLUMN legacy;')).toBe(
      true
    );
    expect(containsContraction('ALTER TABLE users RENAME TO accounts;')).toBe(
      true
    );
    expect(
      containsContraction('ALTER TABLE users ALTER locale TYPE VARCHAR(10);')
    ).toBe(true);
    expect(containsContraction('DROP VIEW active_users;')).toBe(true);
    expect(containsContraction('ALTER TYPE role RENAME TO user_role;')).toBe(
      true
    );
    expect(
      containsContraction(
        'ALTER TABLE users RENAME CONSTRAINT users_pkey TO accounts_pkey;'
      )
    ).toBe(true);
    expect(
      containsContraction('ALTER INDEX users_email_idx RENAME TO email_idx;')
    ).toBe(true);
    expect(
      containsContraction(
        '-- DROP TABLE users\nALTER TABLE users ADD COLUMN locale TEXT;'
      )
    ).toBe(false);
  });

  it('binds staging evidence to a recent release and pending checksums', () => {
    const pending = [
      {
        name: '20260819090000_expand',
        checksum: 'abc123',
        phase: 'expand' as const,
        hasContraction: false,
      },
    ];
    const key = 'test-signing-key-with-at-least-32-characters';
    const attestation = createStagingAttestation(
      'abcdef1234567890abcdef1234567890abcdef12',
      pending,
      key,
      'run-123',
      new Date('2026-08-18T00:00:00.000Z')
    );
    expect(() =>
      verifyStagingAttestation(
        attestation,
        'abcdef1234567890abcdef1234567890abcdef12',
        pending,
        key,
        now
      )
    ).not.toThrow();
    expect(() =>
      verifyStagingAttestation(
        attestation,
        'abcdef1234567890abcdef1234567890abcdef12',
        [{ ...pending[0], checksum: 'changed' }],
        key,
        now
      )
    ).toThrow(/checksums/i);
    expect(() =>
      verifyStagingAttestation(
        attestation,
        '0000000000000000000000000000000000000000',
        pending,
        key,
        now
      )
    ).toThrow(/release SHA/i);
    expect(() =>
      verifyStagingAttestation(
        attestation,
        'abcdef1234567890abcdef1234567890abcdef12',
        pending,
        key,
        new Date('2026-08-26T00:00:00.000Z')
      )
    ).toThrow(/older than seven days/i);
  });

  it('requires retirement, rollback, and retention gates for contract phase', () => {
    const pending = [
      {
        name: 'contract',
        checksum: 'checksum',
        phase: 'contract' as const,
        hasContraction: true,
      },
    ];
    expect(() => assertContractWindow(pending, {}, now)).toThrow(
      /CONTRACT_APPROVED/
    );
    expect(() =>
      assertContractWindow(
        pending,
        {
          MIGRATION_CONTRACT_APPROVED: 'true',
          FLUTTER_RETIREMENT_VERIFIED_AT: '2026-08-01T00:00:00.000Z',
          ROLLBACK_WINDOW_EXPIRES_AT: '2026-08-20T00:00:00.000Z',
          RETENTION_WINDOW_EXPIRES_AT: '2026-08-18T00:00:00.000Z',
        },
        now
      )
    ).toThrow(/rollback window/i);
    expect(() =>
      assertContractWindow(
        pending,
        {
          MIGRATION_CONTRACT_APPROVED: 'true',
          FLUTTER_RETIREMENT_VERIFIED_AT: '2026-08-01T00:00:00.000Z',
          ROLLBACK_WINDOW_EXPIRES_AT: '2026-08-18T00:00:00.000Z',
          RETENTION_WINDOW_EXPIRES_AT: '2026-08-18T00:00:00.000Z',
        },
        now
      )
    ).not.toThrow();
  });

  it('rejects a new migration without reviewed policy metadata', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'migration-policy-'));
    const migrations = path.join(root, 'migrations');
    const migrationName = '20260819090000_new_change';
    await fs.mkdir(path.join(migrations, migrationName), { recursive: true });
    await fs.writeFile(
      path.join(root, 'migration-policy.json'),
      JSON.stringify({
        policyVersion: 1,
        baselineMigration: '20260818090000_baseline',
        legacyMigrations: {},
        migrations: {},
      })
    );
    await fs.writeFile(
      path.join(migrations, migrationName, 'migration.sql'),
      'ALTER TABLE users ADD COLUMN locale TEXT;'
    );
    await expect(loadPendingMigrations(migrations, new Map())).rejects.toThrow(
      /missing.*migration-policy/i
    );
    await fs.rm(root, { recursive: true, force: true });
  });

  it('rejects an unpinned migration even when its name predates the baseline', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'migration-baseline-')
    );
    const migrations = path.join(root, 'migrations');
    const migrationName = '20260817090000_backdated_change';
    await fs.mkdir(path.join(migrations, migrationName), { recursive: true });
    await fs.writeFile(
      path.join(root, 'migration-policy.json'),
      JSON.stringify({
        policyVersion: 1,
        baselineMigration: '20260818090000_baseline',
        legacyMigrations: {},
        migrations: {},
      })
    );
    await fs.writeFile(
      path.join(migrations, migrationName, 'migration.sql'),
      'ALTER TABLE users ADD COLUMN locale TEXT;'
    );
    await expect(loadPendingMigrations(migrations, new Map())).rejects.toThrow(
      /not pinned.*reviewed checksum/i
    );
    await fs.rm(root, { recursive: true, force: true });
  });

  it('validates applied and missing legacy migrations against the manifest', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'migration-history-'));
    const migrations = path.join(root, 'migrations');
    const migrationName = '20260818090000_baseline';
    await fs.mkdir(path.join(migrations, migrationName), { recursive: true });
    await fs.writeFile(
      path.join(migrations, migrationName, 'migration.sql'),
      'SELECT 1;'
    );
    const databaseChecksum = createHash('sha256')
      .update('SELECT 1;')
      .digest('hex');
    await fs.writeFile(
      path.join(root, 'migration-policy.json'),
      JSON.stringify({
        policyVersion: 1,
        baselineMigration: migrationName,
        legacyMigrations: { [migrationName]: '0'.repeat(64) },
        migrations: {},
      })
    );
    await expect(
      loadPendingMigrations(
        migrations,
        new Map([[migrationName, databaseChecksum]])
      )
    ).rejects.toThrow(/reviewed checksum/i);

    await fs.rm(path.join(migrations, migrationName), {
      recursive: true,
      force: true,
    });
    await expect(loadPendingMigrations(migrations, new Map())).rejects.toThrow(
      /no migration directory/i
    );
    await fs.rm(root, { recursive: true, force: true });
  });

  it('checks applied post-baseline migrations against the database history', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'migration-applied-'));
    const migrations = path.join(root, 'migrations');
    const migrationName = '20260819090000_applied_change';
    const sql = 'ALTER TABLE users ADD COLUMN locale TEXT;';
    await fs.mkdir(path.join(migrations, migrationName), { recursive: true });
    await fs.writeFile(
      path.join(migrations, migrationName, 'migration.sql'),
      sql
    );
    await fs.writeFile(
      path.join(root, 'migration-policy.json'),
      JSON.stringify({
        policyVersion: 1,
        baselineMigration: '20260818090000_baseline',
        legacyMigrations: {},
        migrations: {
          [migrationName]: {
            phase: 'expand',
            changeTicket: '#137',
            compatibilityEvidence: 'test',
          },
        },
      })
    );
    await expect(
      loadPendingMigrations(
        migrations,
        new Map([[migrationName, '0'.repeat(64)]])
      )
    ).rejects.toThrow(/database checksum/i);

    await fs.rm(path.join(migrations, migrationName), {
      recursive: true,
      force: true,
    });
    await fs.writeFile(
      path.join(root, 'migration-policy.json'),
      JSON.stringify({
        policyVersion: 1,
        baselineMigration: '20260818090000_baseline',
        legacyMigrations: {},
        migrations: {},
      })
    );
    await expect(
      loadPendingMigrations(
        migrations,
        new Map([
          [migrationName, createHash('sha256').update(sql).digest('hex')],
        ])
      )
    ).rejects.toThrow(/applied database migration.*no local/i);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('enforces the checked-in policy for every post-baseline migration', async () => {
    const pending = await loadPendingMigrations(
      path.resolve(process.cwd(), 'prisma', 'migrations'),
      new Map()
    );
    expect(pending.map((migration) => migration.name)).toContain(
      '20260818090000_add_idempotency_records'
    );
  });

  it('bounds backfill batching and throttling controls', () => {
    expect(
      readBackfillConfig({
        BACKFILL_NAME: 'example',
        BACKFILL_BATCH_SIZE: '1000',
        BACKFILL_THROTTLE_MS: '500',
        BACKFILL_MAX_BATCHES: '4',
      })
    ).toEqual({
      name: 'example',
      batchSize: 1000,
      throttleMs: 500,
      maxBatches: 4,
    });
    expect(() =>
      readBackfillConfig({ BACKFILL_NAME: 'example', BACKFILL_BATCH_SIZE: '0' })
    ).toThrow(/BACKFILL_BATCH_SIZE/);
  });

  it('stops a backfill that cannot advance its stable cursor', () => {
    expect(() =>
      assertBackfillProgress(
        { id: 'cursor-1' },
        { processed: 1, nextCursor: { id: 'cursor-1' }, done: false }
      )
    ).toThrow(/did not advance/i);
    expect(() =>
      assertBackfillProgress(null, {
        processed: 0,
        nextCursor: null,
        done: true,
      })
    ).not.toThrow();
    expect(() =>
      assertBackfillProgress(
        { id: 'cursor-1' },
        { processed: 1, nextCursor: null, done: false }
      )
    ).toThrow(/stable cursor/i);
  });

  it('does not overwrite an active backfill when its advisory lock is held', () => {
    expect(shouldPersistBackfillFailure(false, false)).toBe(false);
    expect(shouldPersistBackfillFailure(true, false)).toBe(false);
    expect(shouldPersistBackfillFailure(true, true)).toBe(true);
  });

  it('keeps migrations out of application startup and defines a protected runner', async () => {
    const [entrypoint, compose, workflow] = await Promise.all([
      fs.readFile(path.resolve(process.cwd(), 'docker-entrypoint.sh'), 'utf8'),
      fs.readFile(path.resolve(process.cwd(), 'docker-compose.yml'), 'utf8'),
      fs.readFile(
        path.resolve(
          process.cwd(),
          '..',
          '.github',
          'workflows',
          'database-migrate.yml'
        ),
        'utf8'
      ),
    ]);
    expect(entrypoint).not.toMatch(/prisma\s+migrate\s+deploy/);
    expect(compose).toMatch(/migrate:/);
    expect(compose).toMatch(/condition: service_completed_successfully/);
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).toMatch(/cancel-in-progress: false/);
    expect(workflow).toMatch(/environment:\s*\n\s*name:/);
    expect(workflow).toMatch(/npm run migrations:deploy/);
    expect(workflow).toMatch(/Upload migration evidence/);
  });
});

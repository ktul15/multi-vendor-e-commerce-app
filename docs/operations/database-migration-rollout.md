# Production database migration rollout

Status: Required runbook for issue #137

Applies to PostgreSQL changes used by the backend, Flutter storefront/vendor/admin apps, Next.js dashboards, and rollback backend builds.

## Non-negotiable controls

- Application containers only start `node dist/server.js`; they never run `prisma migrate deploy`.
- Schema deployment is a separate, manually authorized GitHub Actions job in `.github/workflows/database-migrate.yml`.
- The target GitHub environment (`staging` or `production`) supplies its protected `DATABASE_URL`, a shared `MIGRATION_EVIDENCE_SIGNING_KEY` of at least 32 characters, and required reviewers.
- Workflow concurrency and a PostgreSQL advisory lock allow one runner per database. A second runner records `BLOCKED_LOCKED` and fails.
- Every attempt is recorded in `_deployment_migration_runs`, including actor, release, change ticket, evidence, pending migration checksums, timestamps, result, and bounded failure text.
- A migration failure stops the rollout. Do not start new application instances until the migration owner resolves or rolls forward the failure. Prisma migrations are forward-fix by default; never edit an applied migration.

When a new runner obtains the lock, unfinished `PREPARING`/`RUNNING` rows whose sessions no longer hold it become `ABANDONED`. If schema deployment succeeds but evidence persistence fails, the row becomes `SUCCEEDED_EVIDENCE_FAILED`; treat the schema as changed, stop application rollout, and repair the evidence path instead of rerunning blindly.

The audit and backfill control tables are operational metadata created idempotently by their runners. They are intentionally outside the application Prisma schema.

## Migration authoring policy

Every migration newer than `prisma/migration-policy.json#baselineMigration` must have a policy entry committed with its SQL:

```json
{
  "20260901090000_add_example": {
    "phase": "expand",
    "changeTicket": "#000",
    "compatibilityEvidence": "link-or-repository-evidence-path"
  }
}
```

Allowed phases are `expand`, `backfill`, and `contract`. Historical migrations through `baselineMigration` are pinned by name and SHA-256 in `legacyMigrations`; never add or edit a legacy entry. Before calculating pending work, the runner reconciles every local migration with the policy and every applied migration name/checksum with Prisma's database history. It rejects missing directories, edited applied SQL, an unpinned legacy name, or missing post-baseline metadata. Destructive SQL—including dropped tables/columns/types/constraints, renames, type changes, new `NOT NULL` constraints, truncation/data deletion, and replaced views—is rejected unless classified `contract`.

Never combine expand and contract operations in one migration. Prefer concurrent indexes where PostgreSQL/Prisma transaction behavior permits, bounded lock timeouts, nullable columns, additive tables, and compatible defaults. Estimate table rewrites and lock duration from production-like statistics before approval.

## Expand, backfill, verify, contract

1. **Expand:** Add structures that old and new clients can ignore. Deploy and test a backend build that can read both old and new representations and can roll back without losing writes.
2. **Backfill:** Register reviewed code in `src/scripts/backfills/registry.ts`. Batches use a stable cursor and conditional updates/upserts so the same cursor is safe after a crash. Run `BACKFILL_NAME=<name> npm run backfill:run`.
3. **Verify:** Compare row counts, null/error counts, checksums or domain invariants, query plans, replication lag, and application metrics. Exercise old and new readers/writers.
4. **Contract:** Remove old structures only after all compatibility and retirement gates below pass. Contract changes use a separate release and migration.

Backfill controls:

- Progress and retries persist in `_deployment_backfill_runs`; restarts resume the last committed cursor.
- Each batch and its cursor update commit in one transaction.
- `BACKFILL_BATCH_SIZE` is 1–10,000 (default 500), `BACKFILL_THROTTLE_MS` is 0–60,000 (default 250), and `BACKFILL_MAX_BATCHES` permits a bounded canary or pause.
- SIGINT/SIGTERM and the max-batch limit pause after the current transaction. Another advisory lock prevents duplicate workers.
- JSON events expose processed rows, batches, cursor, completion, and failures. Alert on `FAILED`, stalled `updatedAt`, database load, lock waits, replication lag, and error-rate changes.
- Operators may reduce batch size/increase throttle or pause. They must not manually advance the cursor or mark a run successful.

## Compatibility gate

For every expanded schema, record tests for all applicable combinations:

| Client/runtime                           | Must pass before production expand        | Must pass before contract                 |
| ---------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Flutter storefront                       | Read/write critical shared data           | Retired or explicitly compatible          |
| Flutter vendor dashboard                 | Login, products, orders, payouts, profile | Retirement approved and window expired    |
| Flutter admin panel                      | Login, moderation, commissions, lifecycle | Retirement approved and window expired    |
| Previously deployed Next.js vendor/admin | Read/write and rollback smoke             | No supported deployment uses old fields   |
| New Next.js vendor/admin                 | New and legacy data paths                 | Reads only the contracted representation  |
| Previous backend rollback build          | Starts and serves expanded schema safely  | No longer inside rollback window          |
| New backend build                        | Dual-read/write behavior and invariants   | Contracted schema smoke and rollback plan |

Enum additions require tolerant old clients or a versioned boundary. Renames are add/copy/read-switch/remove operations, never a direct rename during coexistence.

A contract migration additionally requires `MIGRATION_CONTRACT_APPROVED=true` and recorded `FLUTTER_RETIREMENT_VERIFIED_AT`, `ROLLBACK_WINDOW_EXPIRES_AT`, and `RETENTION_WINDOW_EXPIRES_AT`. Both expiry timestamps must be in the past. The approval evidence must cover every Flutter dashboard and old web/backend artifact that touches the structure; an unrelated dashboard retirement does not satisfy the gate.

## Backup, PITR, and restore requirements

Production refuses to run without:

- a provider backup/snapshot ID created for this rollout;
- `MIGRATION_PITR_VERIFIED_AT` no older than 24 hours, proving continuous recovery coverage and the documented recovery window/RPO;
- an isolated restore drill ID and timestamp no older than 90 days;
- a signed successful production-like staging migration attestation no older than seven days.

The restore drill restores a recent representative backup into an isolated account/project/database with production networking disabled. Record backup identity, source timestamp, target isolation, start/end, data/invariant checks, application smoke build, measured RPO/RTO, operator, cleanup, and evidence links. A dashboard screenshot or provider “backup enabled” flag alone is insufficient.

Before each production change, verify the requested recovery timestamp is inside the provider recovery window and credentials can perform the restore. Never test restoration over the source database.

## Staging rehearsal

Run the workflow against `staging` using the exact release SHA and migration set intended for production. Use production-like schema size/statistics and sanitized data. Evidence must include:

- pending migration names/checksums and policy phases;
- duration, locks, query/database load, replication behavior, and application availability;
- backfill canary, pause/resume, throttle change, invariant verification, and failure recovery where applicable;
- old Flutter, old/new web, and previous/new backend compatibility results;
- application rollback rehearsal while retaining the expanded schema;
- named approvals and unresolved risk decision.

Any SQL, policy, backfill, release SHA, or relevant environment change invalidates the rehearsal and requires another staging run.

The successful staging artifact contains `stagingAttestation`, signed with the protected environment key and bound to the release SHA and pending migration names/checksums. Copy that complete value into the production workflow's `staging_evidence` input. Production verifies its signature, age, SHA, and checksums before invoking Prisma; a workflow URL or arbitrary run ID is not accepted. Configure the same signing key in both protected environments and rotate it through the secret-management process after any suspected disclosure.

## Production procedure

1. Freeze the immutable release SHA; link its passing CI and reviewed migration policy.
2. Confirm on-call ownership, maintenance/traffic plan, alerts, abort thresholds, and forward-fix steps.
3. Create/verify the backup and PITR evidence; confirm the isolated restore drill is current.
4. Copy the signed attestation from the successful staging artifact and confirm it covers the identical SHA and pending checksums.
5. Dispatch **Database migration** for `production` and obtain the protected-environment approval.
6. Observe the audit row, PostgreSQL locks/load/replication, application errors, and workflow evidence. Do not run a second job.
7. Verify Prisma reports no pending migration, domain invariants pass, and old/new/rollback builds remain compatible.
8. Deploy application instances only after migration success and verification. Record health/rollback evidence and close the change record.

On failure, stop the application rollout and backfills, retain logs/audit evidence, assess whether the failing statement committed, and follow the reviewed forward-fix plan. Restore is an incident-level decision when forward repair cannot protect integrity; it requires operations and migration-owner approval and reconciliation of writes after the recovery point.

## Evidence queries and retention

```sql
SELECT * FROM "_deployment_migration_runs" ORDER BY "startedAt" DESC LIMIT 20;
SELECT * FROM "_deployment_backfill_runs" ORDER BY "updatedAt" DESC;
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM "_prisma_migrations" ORDER BY started_at DESC;
```

The workflow uploads `migration-evidence.json` for 365 days. Copy it, provider backup/PITR proof, restore drill results, staging metrics, compatibility matrix, approvals, production metrics, and incident/rollback notes into the durable change record according to the organization’s longer audit-retention policy.

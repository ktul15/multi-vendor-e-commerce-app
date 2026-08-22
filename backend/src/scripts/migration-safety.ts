import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export type MigrationEnvironment = 'staging' | 'production';
export type MigrationPhase = 'expand' | 'backfill' | 'contract';

type Environment = NodeJS.ProcessEnv;

export type MigrationPolicyEntry = Readonly<{
  phase: MigrationPhase;
  changeTicket: string;
  compatibilityEvidence: string;
}>;

type MigrationPolicyFile = Readonly<{
  policyVersion: number;
  baselineMigration: string;
  legacyMigrations: Record<string, string>;
  migrations: Record<string, MigrationPolicyEntry>;
}>;

export type PendingMigration = Readonly<{
  name: string;
  checksum: string;
  phase: MigrationPhase | 'legacy-baseline';
  hasContraction: boolean;
  policyChangeTicket?: string;
  compatibilityEvidence?: string;
}>;

export type MigrationIdentity = Readonly<{
  environment: MigrationEnvironment;
  releaseSha: string;
  actor: string;
  changeTicket: string;
  evidenceUrl?: string;
}>;

export type MigrationContext = MigrationIdentity &
  Readonly<{
    backupId?: string;
    pitrVerifiedAt?: Date;
    restoreDrillId?: string;
    restoreDrillVerifiedAt?: Date;
    stagingEvidence?: string;
  }>;

const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const STAGING_ATTESTATION_MAX_AGE_MS = 7 * DAY_MS;

type StagingAttestationPayload = Readonly<{
  version: 1;
  environment: 'staging';
  status: 'SUCCEEDED';
  runId: string;
  releaseSha: string;
  pending: readonly Readonly<{ name: string; checksum: string }>[];
  finishedAt: string;
}>;

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function timestamp(
  env: Environment,
  name: string,
  now: Date,
  maximumAgeMs?: number,
  allowFuture = false
): Date {
  const value = required(env, name);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${name} must be an ISO-8601 timestamp`);
  }
  if (!allowFuture && parsed.getTime() > now.getTime() + FUTURE_CLOCK_SKEW_MS) {
    throw new Error(`${name} cannot be in the future`);
  }
  if (maximumAgeMs && now.getTime() - parsed.getTime() > maximumAgeMs) {
    throw new Error(`${name} is older than the permitted evidence window`);
  }
  return parsed;
}

export function readMigrationIdentity(
  env: Environment = process.env
): MigrationIdentity {
  const environment = required(env, 'MIGRATION_ENVIRONMENT');
  if (environment !== 'staging' && environment !== 'production') {
    throw new Error('MIGRATION_ENVIRONMENT must be staging or production');
  }
  const releaseSha = required(env, 'MIGRATION_RELEASE_SHA');
  if (!/^[a-f\d]{40}$/i.test(releaseSha)) {
    throw new Error(
      'MIGRATION_RELEASE_SHA must be a full 40-character Git commit SHA'
    );
  }
  return {
    environment,
    releaseSha,
    actor: required(env, 'MIGRATION_ACTOR'),
    changeTicket: required(env, 'MIGRATION_CHANGE_TICKET'),
    evidenceUrl: env.MIGRATION_EVIDENCE_URL?.trim() || undefined,
  };
}

export function readMigrationContext(
  env: Environment = process.env,
  now = new Date()
): MigrationContext {
  const base = readMigrationIdentity(env);
  if (base.environment === 'staging') return base;
  return {
    ...base,
    backupId: required(env, 'MIGRATION_BACKUP_ID'),
    pitrVerifiedAt: timestamp(env, 'MIGRATION_PITR_VERIFIED_AT', now, DAY_MS),
    restoreDrillId: required(env, 'MIGRATION_RESTORE_DRILL_ID'),
    restoreDrillVerifiedAt: timestamp(
      env,
      'MIGRATION_RESTORE_DRILL_VERIFIED_AT',
      now,
      90 * DAY_MS
    ),
    stagingEvidence: required(env, 'MIGRATION_STAGING_EVIDENCE'),
  };
}

function withoutSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ');
}

export function containsContraction(sql: string): boolean {
  const normalized = withoutSqlComments(sql).replace(/\s+/g, ' ').toUpperCase();
  return [
    /\bDROP\s+(TABLE|COLUMN|TYPE|VIEW|DOMAIN|SEQUENCE|FUNCTION)\b/,
    /\bDROP\s+MATERIALIZED\s+VIEW\b/,
    /\bDROP\s+CONSTRAINT\b/,
    /\bALTER\s+TABLE\b[^;]*\bDROP\b/,
    /\bRENAME\s+(COLUMN|TABLE|CONSTRAINT)\b/,
    /\bALTER\s+(?:TABLE|INDEX|TYPE|VIEW|MATERIALIZED\s+VIEW|SEQUENCE|DOMAIN|FUNCTION)\b[^;]*\bRENAME\b/,
    /\bALTER\s+(?:COLUMN\s+)?(?:"[^"]+"|[A-Z_][A-Z\d_$]*)\s+SET\s+NOT\s+NULL\b/,
    /\bALTER\s+(?:COLUMN\s+)?(?:"[^"]+"|[A-Z_][A-Z\d_$]*)\s+(?:SET\s+DATA\s+)?TYPE\b/,
    /\bTRUNCATE\b/,
    /\bDELETE\s+FROM\b/,
    /\bCREATE\s+OR\s+REPLACE\s+(MATERIALIZED\s+)?VIEW\b/,
  ].some((pattern) => pattern.test(normalized));
}

function normalizedPending(pending: readonly PendingMigration[]) {
  return pending
    .map(({ name, checksum }) => ({ name, checksum }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function signingKey(key: string): string {
  if (key.length < 32) {
    throw new Error(
      'MIGRATION_EVIDENCE_SIGNING_KEY must be at least 32 characters'
    );
  }
  return key;
}

export function createStagingAttestation(
  releaseSha: string,
  pending: readonly PendingMigration[],
  key: string,
  runId: string,
  finishedAt: Date
): string {
  const payload: StagingAttestationPayload = {
    version: 1,
    environment: 'staging',
    status: 'SUCCEEDED',
    runId,
    releaseSha,
    pending: normalizedPending(pending),
    finishedAt: finishedAt.toISOString(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url'
  );
  const signature = createHmac('sha256', signingKey(key))
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyStagingAttestation(
  attestation: string,
  expectedReleaseSha: string,
  expectedPending: readonly PendingMigration[],
  key: string,
  now = new Date()
): void {
  const parts = attestation.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('MIGRATION_STAGING_EVIDENCE must be a signed attestation');
  }
  const expectedSignature = createHmac('sha256', signingKey(key))
    .update(parts[0])
    .digest();
  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(parts[1], 'base64url');
  } catch {
    throw new Error('MIGRATION_STAGING_EVIDENCE has an invalid signature');
  }
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new Error('MIGRATION_STAGING_EVIDENCE has an invalid signature');
  }

  let payload: StagingAttestationPayload;
  try {
    payload = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as StagingAttestationPayload;
  } catch {
    throw new Error('MIGRATION_STAGING_EVIDENCE has an invalid payload');
  }
  const finishedAt = new Date(payload.finishedAt);
  if (
    payload.version !== 1 ||
    payload.environment !== 'staging' ||
    payload.status !== 'SUCCEEDED' ||
    !payload.runId ||
    Number.isNaN(finishedAt.getTime())
  ) {
    throw new Error('MIGRATION_STAGING_EVIDENCE has an invalid payload');
  }
  if (payload.releaseSha !== expectedReleaseSha) {
    throw new Error('Staging evidence release SHA does not match production');
  }
  if (
    JSON.stringify(payload.pending) !==
    JSON.stringify(normalizedPending(expectedPending))
  ) {
    throw new Error(
      'Staging evidence migration checksums do not match production'
    );
  }
  if (finishedAt.getTime() > now.getTime() + FUTURE_CLOCK_SKEW_MS) {
    throw new Error('Staging evidence cannot be in the future');
  }
  if (now.getTime() - finishedAt.getTime() > STAGING_ATTESTATION_MAX_AGE_MS) {
    throw new Error('Staging evidence is older than seven days');
  }
}

export async function loadPendingMigrations(
  migrationsDirectory: string,
  appliedMigrations: ReadonlyMap<string, string>
): Promise<PendingMigration[]> {
  const policyPath = path.join(
    migrationsDirectory,
    '..',
    'migration-policy.json'
  );
  const policy = JSON.parse(
    await fs.readFile(policyPath, 'utf8')
  ) as MigrationPolicyFile;
  if (
    policy.policyVersion !== 1 ||
    !policy.baselineMigration ||
    !policy.legacyMigrations ||
    typeof policy.legacyMigrations !== 'object'
  ) {
    throw new Error('Unsupported or invalid migration policy file');
  }
  const entries = await fs.readdir(migrationsDirectory, {
    withFileTypes: true,
  });
  const migrationEntries = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const migrationNames = new Set(migrationEntries.map((entry) => entry.name));
  for (const name of appliedMigrations.keys()) {
    if (!migrationNames.has(name)) {
      throw new Error(
        `Applied database migration ${name} has no local migration directory`
      );
    }
  }
  for (const [name, checksum] of Object.entries(policy.legacyMigrations)) {
    if (
      name > policy.baselineMigration ||
      !/^[a-f\d]{64}$/i.test(checksum) ||
      !migrationNames.has(name)
    ) {
      throw new Error(
        `Legacy migration policy entry ${name} is invalid or has no migration directory`
      );
    }
  }
  for (const name of Object.keys(policy.migrations)) {
    if (name <= policy.baselineMigration || !migrationNames.has(name)) {
      throw new Error(
        `Migration policy entry ${name} is invalid or has no migration directory`
      );
    }
  }
  const pending: PendingMigration[] = [];
  for (const entry of migrationEntries) {
    const sqlPath = path.join(migrationsDirectory, entry.name, 'migration.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const appliedChecksum = appliedMigrations.get(entry.name);
    if (appliedChecksum !== undefined && appliedChecksum !== checksum) {
      throw new Error(
        `Applied migration ${entry.name} does not match the database checksum`
      );
    }
    const hasContraction = containsContraction(sql);
    if (entry.name <= policy.baselineMigration) {
      if (policy.legacyMigrations[entry.name] !== checksum) {
        throw new Error(
          `Legacy migration ${entry.name} is not pinned to its reviewed checksum in prisma/migration-policy.json`
        );
      }
      if (!appliedMigrations.has(entry.name)) {
        pending.push({
          name: entry.name,
          checksum,
          phase: 'legacy-baseline',
          hasContraction,
        });
      }
      continue;
    }
    const migrationPolicy = policy.migrations[entry.name];
    if (!migrationPolicy) {
      throw new Error(
        `Migration ${entry.name} is missing from prisma/migration-policy.json`
      );
    }
    if (
      !['expand', 'backfill', 'contract'].includes(migrationPolicy.phase) ||
      !migrationPolicy.changeTicket ||
      !migrationPolicy.compatibilityEvidence
    ) {
      throw new Error(`Migration ${entry.name} has incomplete policy metadata`);
    }
    if (hasContraction && migrationPolicy.phase !== 'contract') {
      throw new Error(
        `Migration ${entry.name} contains contraction SQL but is classified ${migrationPolicy.phase}`
      );
    }
    if (appliedMigrations.has(entry.name)) continue;
    pending.push({
      name: entry.name,
      checksum,
      phase: migrationPolicy.phase,
      hasContraction,
      policyChangeTicket: migrationPolicy.changeTicket,
      compatibilityEvidence: migrationPolicy.compatibilityEvidence,
    });
  }
  return pending;
}

export function assertContractWindow(
  pending: readonly PendingMigration[],
  env: Environment = process.env,
  now = new Date()
): void {
  if (!pending.some((migration) => migration.phase === 'contract')) return;
  if (env.MIGRATION_CONTRACT_APPROVED !== 'true') {
    throw new Error('MIGRATION_CONTRACT_APPROVED=true is required');
  }
  timestamp(env, 'FLUTTER_RETIREMENT_VERIFIED_AT', now);
  const rollbackExpiry = timestamp(
    env,
    'ROLLBACK_WINDOW_EXPIRES_AT',
    now,
    undefined,
    true
  );
  const retentionExpiry = timestamp(
    env,
    'RETENTION_WINDOW_EXPIRES_AT',
    now,
    undefined,
    true
  );
  if (rollbackExpiry.getTime() > now.getTime()) {
    throw new Error('The rollback window has not expired');
  }
  if (retentionExpiry.getTime() > now.getTime()) {
    throw new Error('The retention window has not expired');
  }
}

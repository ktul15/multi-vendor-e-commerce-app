import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../generated/prisma/client';
import { loginSchema } from '../modules/auth/auth.schema';
import { hashPassword } from '../utils/password';

const EXPECTED_ENVIRONMENT = 'staging';
const REQUIRED_CONFIRMATION = 'CREATE_STAGING_ADMIN';
const MINIMUM_PASSWORD_LENGTH = 16;
const MAXIMUM_PASSWORD_LENGTH = 100;

export type StagingAdminBootstrapConfig = {
  databaseUrl: string;
  email: string;
  name: string;
  password: string;
};

function requiredValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function readStagingAdminBootstrapConfig(
  environment: NodeJS.ProcessEnv
): StagingAdminBootstrapConfig {
  if (environment['RAILWAY_ENVIRONMENT_NAME'] !== EXPECTED_ENVIRONMENT) {
    throw new Error(
      `Refusing to bootstrap an admin outside the Railway ${EXPECTED_ENVIRONMENT} environment.`
    );
  }

  if (environment['STAGING_BOOTSTRAP_CONFIRMATION'] !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Set STAGING_BOOTSTRAP_CONFIRMATION=${REQUIRED_CONFIRMATION} to confirm the staging admin bootstrap.`
    );
  }

  const databaseUrl = requiredValue(environment, 'DATABASE_URL');
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL URL.');
  }

  const email = requiredValue(environment, 'STAGING_ADMIN_EMAIL')
    .trim()
    .toLowerCase();
  if (!loginSchema.shape.email.safeParse(email).success) {
    throw new Error('STAGING_ADMIN_EMAIL must be a valid email address.');
  }

  const password = requiredValue(environment, 'STAGING_ADMIN_PASSWORD');
  const passwordCharacterClasses = [
    /[a-z]/,
    /[A-Z]/,
    /\d/,
    /[^A-Za-z0-9]/,
  ].filter((pattern) => pattern.test(password)).length;
  if (
    password.length < MINIMUM_PASSWORD_LENGTH ||
    password.length > MAXIMUM_PASSWORD_LENGTH ||
    passwordCharacterClasses < 3
  ) {
    throw new Error(
      `STAGING_ADMIN_PASSWORD must contain ${MINIMUM_PASSWORD_LENGTH}-${MAXIMUM_PASSWORD_LENGTH} characters and at least three of: lowercase, uppercase, numbers, and symbols.`
    );
  }

  const name = environment['STAGING_ADMIN_NAME']?.trim() || 'Staging Admin';
  if (name.length < 2 || name.length > 100) {
    throw new Error('STAGING_ADMIN_NAME must contain 2-100 characters.');
  }

  return { databaseUrl, email, name, password };
}

export function existingAdminUpdateData(
  config: Pick<StagingAdminBootstrapConfig, 'name'>,
  passwordHash: string
) {
  return {
    name: config.name,
    password: passwordHash,
    isVerified: true,
  };
}

export async function bootstrapStagingAdmin(
  config: StagingAdminBootstrapConfig
): Promise<'created' | 'updated'> {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    return await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        where: { email: config.email },
        select: { id: true, role: true },
      });

      if (existingUser && existingUser.role !== Role.ADMIN) {
        throw new Error(
          `Refusing to elevate existing ${existingUser.role} account ${config.email}. Use a different email or review the account manually.`
        );
      }

      const password = await hashPassword(config.password);
      if (existingUser) {
        await transaction.user.update({
          where: { id: existingUser.id },
          data: existingAdminUpdateData(config, password),
        });
        return 'updated';
      }

      await transaction.user.create({
        data: {
          name: config.name,
          email: config.email,
          password,
          role: Role.ADMIN,
          isVerified: true,
          isBanned: false,
        },
      });
      return 'created';
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const config = readStagingAdminBootstrapConfig(process.env);
  const result = await bootstrapStagingAdmin(config);
  console.info(`Staging admin ${config.email} ${result} successfully.`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Staging admin bootstrap failed: ${message}`);
    process.exitCode = 1;
  });
}

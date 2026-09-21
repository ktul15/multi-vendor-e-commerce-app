import {
  existingAdminUpdateData,
  readStagingAdminBootstrapConfig,
} from '../../src/scripts/bootstrap-staging-admin';

const validEnvironment = (): NodeJS.ProcessEnv => ({
  RAILWAY_ENVIRONMENT_NAME: 'staging',
  STAGING_BOOTSTRAP_CONFIRMATION: 'CREATE_STAGING_ADMIN',
  DATABASE_URL: 'postgresql://user:password@database.example:5432/railway',
  STAGING_ADMIN_EMAIL: 'Admin.Staging@example.com',
  STAGING_ADMIN_PASSWORD: 'A-unique-password-with-16-characters-9',
});

describe('staging admin bootstrap safety gates', () => {
  it('accepts an explicitly confirmed Railway staging environment', () => {
    expect(readStagingAdminBootstrapConfig(validEnvironment())).toEqual({
      databaseUrl: 'postgresql://user:password@database.example:5432/railway',
      email: 'admin.staging@example.com',
      name: 'Staging Admin',
      password: 'A-unique-password-with-16-characters-9',
    });
  });

  it.each(['production', 'development', '', undefined])(
    'refuses the %s Railway environment',
    (railwayEnvironment) => {
      const environment = validEnvironment();
      if (railwayEnvironment === undefined) {
        delete environment.RAILWAY_ENVIRONMENT_NAME;
      } else {
        environment.RAILWAY_ENVIRONMENT_NAME = railwayEnvironment;
      }

      expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
        'Refusing to bootstrap an admin outside the Railway staging environment.'
      );
    }
  );

  it('requires the exact destructive-action confirmation', () => {
    const environment = validEnvironment();
    environment.STAGING_BOOTSTRAP_CONFIRMATION = 'yes';

    expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
      'Set STAGING_BOOTSTRAP_CONFIRMATION=CREATE_STAGING_ADMIN'
    );
  });

  it('requires a PostgreSQL database URL', () => {
    const environment = validEnvironment();
    environment.DATABASE_URL = 'redis://cache.example:6379';

    expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
      'DATABASE_URL must be a PostgreSQL URL.'
    );
  });

  it('requires a valid admin email', () => {
    const environment = validEnvironment();
    environment.STAGING_ADMIN_EMAIL = 'not-an-email';

    expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
      'STAGING_ADMIN_EMAIL must be a valid email address.'
    );
  });

  it('rejects an email that the login schema cannot accept', () => {
    const environment = validEnvironment();
    environment.STAGING_ADMIN_EMAIL = 'a..b@example.com';

    expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
      'STAGING_ADMIN_EMAIL must be a valid email address.'
    );
  });

  it('requires a password within the login contract limits', () => {
    const environment = validEnvironment();
    environment.STAGING_ADMIN_PASSWORD = 'too-short';

    expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
      'STAGING_ADMIN_PASSWORD must contain 16-100 characters and at least three of:'
    );
  });

  it('rejects a long password without enough character variety', () => {
    const environment = validEnvironment();
    environment.STAGING_ADMIN_PASSWORD = 'onlylowercaseletters';

    expect(() => readStagingAdminBootstrapConfig(environment)).toThrow(
      'at least three of: lowercase, uppercase, numbers, and symbols.'
    );
  });

  it('preserves the ban state when refreshing an existing admin', () => {
    const update = existingAdminUpdateData(
      { name: 'Staging Admin' },
      'hashed-password'
    );

    expect(update).toEqual({
      name: 'Staging Admin',
      password: 'hashed-password',
      isVerified: true,
    });
    expect(update).not.toHaveProperty('isBanned');
  });
});

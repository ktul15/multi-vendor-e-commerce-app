describe('Production security configuration', () => {
  const originalEnv = { ...process.env };

  const productionEnvironment = () => {
    process.env.NODE_ENV = 'production';
    process.env.STOREFRONT_URL = 'https://storefront.example.com';
    process.env.VENDOR_DASHBOARD_URL = 'https://vendor.example.com';
    process.env.ADMIN_DASHBOARD_URL = 'https://admin.example.com';
    process.env.DASHBOARD_BFF_SECRET =
      'dashboard-bff-secret-with-at-least-32-characters';
    process.env.JWT_ACCESS_SECRET =
      'access-signing-secret-with-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET =
      'refresh-signing-secret-with-at-least-32-characters';
    process.env.STRIPE_CONNECT_RETURN_URL =
      'https://vendor.example.com/stripe/return';
    process.env.STRIPE_CONNECT_REFRESH_URL =
      'https://vendor.example.com/stripe/refresh';
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('refuses to start without an explicit strong access-token secret', async () => {
    productionEnvironment();
    process.env.JWT_ACCESS_SECRET = '';
    jest.resetModules();

    await expect(import('../../config/env')).rejects.toThrow(
      'JWT_ACCESS_SECRET must contain at least 32 characters in production'
    );
  });

  it('requires separate access and refresh signing secrets', async () => {
    productionEnvironment();
    process.env.JWT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET;
    jest.resetModules();

    await expect(import('../../config/env')).rejects.toThrow(
      'JWT access and refresh secrets must be different in production'
    );
  });

  it('rejects Stripe Connect redirects outside the vendor dashboard origin', async () => {
    productionEnvironment();
    process.env.STRIPE_CONNECT_RETURN_URL =
      'https://attacker.example/stripe/return';
    jest.resetModules();

    await expect(import('../../config/env')).rejects.toThrow(
      'STRIPE_CONNECT_RETURN_URL must be an HTTP(S) URL on VENDOR_DASHBOARD_URL'
    );
  });
});

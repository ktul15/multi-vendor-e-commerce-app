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

  it('rejects live payment credentials in the sandbox-only release', async () => {
    productionEnvironment();
    process.env.STRIPE_SECRET_KEY = 'sk_live_not_allowed';
    jest.resetModules();

    await expect(import('../../config/env')).rejects.toThrow(
      'STRIPE_SECRET_KEY must be a sandbox/test credential'
    );

    process.env.STRIPE_SECRET_KEY = 'sk_test_allowed';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_not_allowed';
    jest.resetModules();
    await expect(import('../../config/env')).rejects.toThrow(
      'RAZORPAY_KEY_ID must be a sandbox/test credential'
    );
  });

  it('requires a private Razorpay webhook secret outside mock mode', async () => {
    productionEnvironment();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_allowed';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    process.env.RAZORPAY_SANDBOX_MOCK = 'false';
    process.env.RAZORPAY_WEBHOOK_SECRET = '';
    jest.resetModules();

    await expect(import('../../config/razorpay')).rejects.toThrow(
      'RAZORPAY_WEBHOOK_SECRET is required when Razorpay sandbox mock mode is disabled'
    );
  });
});

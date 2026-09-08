import request from 'supertest';

describe('Production security headers', () => {
  const originalEnv = { ...process.env };

  afterAll(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('applies the Helmet baseline with required HTTPS origins', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STOREFRONT_URL = 'https://storefront.example.com';
    process.env.VENDOR_DASHBOARD_URL = 'https://vendor.example.com';
    process.env.ADMIN_DASHBOARD_URL = 'https://admin.example.com';
    process.env.DASHBOARD_BFF_SECRET =
      'production-security-test-secret-32-characters';
    process.env.JWT_ACCESS_SECRET =
      'production-access-signing-secret-32-characters';
    process.env.JWT_REFRESH_SECRET =
      'production-refresh-signing-secret-32-characters';
    process.env.STRIPE_CONNECT_RETURN_URL =
      'https://vendor.example.com/stripe/return';
    process.env.STRIPE_CONNECT_REFRESH_URL =
      'https://vendor.example.com/stripe/refresh';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_production_security';
    process.env.RAZORPAY_KEY_SECRET = 'test-secret';
    process.env.RAZORPAY_WEBHOOK_SECRET =
      'test-webhook-secret-with-at-least-32-characters';
    process.env.RAZORPAY_SANDBOX_MOCK = 'false';
    process.env.CLOUDINARY_CLOUD_NAME = 'production-security-test';
    process.env.CLOUDINARY_API_KEY = 'production-security-test-key';
    process.env.CLOUDINARY_API_SECRET = 'production-security-test-secret';
    jest.resetModules();
    const { default: productionApp } = await import('../../app');

    const response = await request(productionApp)
      .options('/api/v1/auth/logout')
      .set('Origin', process.env.STOREFRONT_URL)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'"
    );
    expect(response.headers['strict-transport-security']).toContain('max-age=');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe(
      'same-origin'
    );
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

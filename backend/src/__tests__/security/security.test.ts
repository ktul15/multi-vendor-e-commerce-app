import request from 'supertest';
import app from '../../app';
import { env } from '../../config/env';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_ERROR_HEADER_NAME,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_MISMATCH,
} from '../../modules/auth/auth.cookies';

describe('Browser request security', () => {
  describe('credentialed CORS', () => {
    it.each([
      env.STOREFRONT_URL,
      env.VENDOR_DASHBOARD_URL,
      env.ADMIN_DASHBOARD_URL,
    ])('allows the configured exact origin %s', async (origin) => {
      const response = await request(app)
        .options('/api/v1/auth/logout')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,x-csrf-token');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-headers']).toContain(
        'X-CSRF-Token'
      );
      expect(response.headers['access-control-expose-headers']).toContain(
        'X-CSRF-Token'
      );
      expect(response.headers.vary).toContain('Origin');
    });

    it('rejects an unconfigured origin without CORS credentials', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://attacker.example');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Origin is not allowed');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(
        response.headers['access-control-allow-credentials']
      ).toBeUndefined();
    });

    it('rejects localhost ports that were not explicitly configured', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3999');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Origin is not allowed');
    });

    it('allows clients that do not send a browser Origin header', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('cookie-session CSRF protection', () => {
    const authCookie = `${ACCESS_COOKIE_NAME}=cookie-access-token`;
    const csrfCookie = `${CSRF_COOKIE_NAME}=csrf-token`;

    it('rejects cross-site mutations before authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ email: 'attacker@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Cross-site request is not allowed');
    });

    it('allows cross-site requests from an exact configured origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', env.VENDOR_DASHBOARD_URL)
        .set('Sec-Fetch-Site', 'cross-site')
        .send({});

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(
        env.VENDOR_DASHBOARD_URL
      );
    });

    it('rejects a cookie-authenticated mutation without a CSRF token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('CSRF token is required');
    });

    it('rejects a cookie-authenticated mutation with a mismatched token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `${authCookie}; ${csrfCookie}`)
        .set(CSRF_HEADER_NAME, 'wrong-token')
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid CSRF token');
      expect(response.headers[CSRF_ERROR_HEADER_NAME.toLowerCase()]).toBe(
        CSRF_TOKEN_MISMATCH
      );
    });

    it('allows a cookie-authenticated mutation with a matching token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `${authCookie}; ${csrfCookie}`)
        .set(CSRF_HEADER_NAME, 'csrf-token')
        .send({});

      expect(response.status).toBe(200);
    });

    it('exposes an existing CSRF token so trusted clients can bootstrap after reload', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Origin', env.VENDOR_DASHBOARD_URL)
        .set('Cookie', csrfCookie);

      expect(response.status).toBe(401);
      expect(response.headers[CSRF_HEADER_NAME.toLowerCase()]).toBe(
        'csrf-token'
      );
      expect(response.headers['access-control-expose-headers']).toContain(
        CSRF_HEADER_NAME
      );
    });

    it('keeps bearer and unauthenticated mutations outside the CSRF contract', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send({});

      expect(response.status).toBe(200);
    });

    it('does not let stale cookies override bearer authentication precedence', async () => {
      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', 'Bearer invalid-token')
        .set('Cookie', authCookie)
        .send({ productId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid access token');
    });
  });
});

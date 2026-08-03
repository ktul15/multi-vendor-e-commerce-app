import request from 'supertest';
import app from '../../app';
import { setupTestDB, teardownTestDB, cleanDatabase } from '../setup';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  REFRESH_COOKIE_NAME,
} from '../../modules/auth/auth.cookies';

const cookiePair = (setCookie: string[], name: string): string => {
  const cookie = setCookie.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.split(';')[0];
};

const cookieValue = (pair: string): string =>
  decodeURIComponent(pair.slice(pair.indexOf('=') + 1));

describe('Auth API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ============================
  // POST /api/v1/auth/register
  // ============================
  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should register a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.data.user).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'CUSTOMER',
        isVerified: false,
      });
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      // Password should never be in the response
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 409 if email already exists', async () => {
      // Register first
      await request(app).post('/api/v1/auth/register').send(validUser);

      // Try duplicate
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email is already registered');
    });

    it('should return 400 with field errors if fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'john@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
      // Should have field-level errors for name and password
      const fields = res.body.errors.map((e: { field: string }) => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('password');
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      const pwError = res.body.errors.find(
        (e: { field: string }) => e.field === 'password'
      );
      expect(pwError).toBeDefined();
    });

    it('should return 400 if email format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'not-an-email' });

      expect(res.status).toBe(400);
      const emailError = res.body.errors.find(
        (e: { field: string }) => e.field === 'email'
      );
      expect(emailError.message).toBe('Invalid email address');
    });

    it('should normalize email to lowercase', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'JOHN@Example.COM' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('john@example.com');
    });
  });

  // ============================
  // POST /api/v1/auth/login
  // ============================
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Seed a user for login tests
      await prisma.user.create({
        data: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: await hashPassword('password123'),
          role: 'CUSTOMER',
          isVerified: true,
        },
      });
    });

    it('should login with valid credentials and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jane@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jane@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 403 if user is banned', async () => {
      await prisma.user.update({
        where: { email: 'jane@example.com' },
        data: { isBanned: true },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jane@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Your account has been suspended');
    });

    it('should return 400 with field errors if fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      const fields = res.body.errors.map((e: { field: string }) => e.field);
      expect(fields).toContain('password');
    });
  });

  // ============================
  // Browser cookie sessions
  // ============================
  describe('Web cookie sessions', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          name: 'Web User',
          email: 'web@example.com',
          password: await hashPassword('password123'),
          role: 'VENDOR',
          isVerified: true,
        },
      });
    });

    const loginWithCookies = async () =>
      request(app)
        .post('/api/v1/auth/login')
        .set('X-Auth-Mode', 'cookie')
        .send({ email: 'web@example.com', password: 'password123' });

    it('issues secure HttpOnly cookies without exposing tokens in the body', async () => {
      const res = await loginWithCookies();
      const setCookie = res.headers['set-cookie'] as unknown as string[];

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('web@example.com');
      expect(res.body.data.tokens).toBeUndefined();
      expect(setCookie).toHaveLength(3);
      const accessCookie = setCookie.find((value) =>
        value.startsWith(`${ACCESS_COOKIE_NAME}=`)
      );
      const refreshCookie = setCookie.find((value) =>
        value.startsWith(`${REFRESH_COOKIE_NAME}=`)
      );
      const csrfCookie = setCookie.find((value) =>
        value.startsWith(`${CSRF_COOKIE_NAME}=`)
      );
      expect(accessCookie).toContain('Path=/api/v1;');
      expect(refreshCookie).toContain('Path=/api/v1/auth;');
      for (const cookie of [accessCookie, refreshCookie]) {
        expect(cookie).toMatch(/Max-Age=\d+/);
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('SameSite=Lax');
      }
      expect(csrfCookie).toContain('Path=/api/v1;');
      expect(csrfCookie).toContain('Secure');
      expect(csrfCookie).toContain('SameSite=Lax');
      expect(csrfCookie).not.toContain('HttpOnly');
      expect(res.headers[CSRF_HEADER_NAME.toLowerCase()]).toBe(
        cookieValue(cookiePair(setCookie, CSRF_COOKIE_NAME))
      );
    });

    it('authenticates protected requests with the access cookie', async () => {
      const loginRes = await loginWithCookies();
      const setCookie = loginRes.headers['set-cookie'] as unknown as string[];

      const profileRes = await request(app)
        .get('/api/v1/auth/profile')
        .set('Cookie', cookiePair(setCookie, ACCESS_COOKIE_NAME));

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.email).toBe('web@example.com');
    });

    it('rotates cookie tokens and revokes the previous refresh token', async () => {
      const loginRes = await loginWithCookies();
      const originalCookies = loginRes.headers[
        'set-cookie'
      ] as unknown as string[];
      const oldRefreshPair = cookiePair(originalCookies, REFRESH_COOKIE_NAME);
      const csrfPair = cookiePair(originalCookies, CSRF_COOKIE_NAME);

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${oldRefreshPair}; ${csrfPair}`)
        .set(CSRF_HEADER_NAME, cookieValue(csrfPair))
        .send({});
      const rotatedCookies = refreshRes.headers[
        'set-cookie'
      ] as unknown as string[];

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data).toBeNull();
      expect(cookiePair(rotatedCookies, REFRESH_COOKIE_NAME)).not.toBe(
        oldRefreshPair
      );

      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: cookieValue(oldRefreshPair) });
      expect(replayRes.status).toBe(401);
      expect(replayRes.body.message).toBe('Refresh token has been revoked');
    });

    it('allows exactly one concurrent rotation of the same refresh token', async () => {
      const loginRes = await loginWithCookies();
      const originalCookies = loginRes.headers[
        'set-cookie'
      ] as unknown as string[];
      const refreshPair = cookiePair(originalCookies, REFRESH_COOKIE_NAME);
      const csrfPair = cookiePair(originalCookies, CSRF_COOKIE_NAME);
      const cookies = `${refreshPair}; ${csrfPair}`;
      const csrfToken = cookieValue(csrfPair);

      const responses = await Promise.all([
        request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', cookies)
          .set(CSRF_HEADER_NAME, csrfToken)
          .send({}),
        request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', cookies)
          .set(CSRF_HEADER_NAME, csrfToken)
          .send({}),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 401,
      ]);
      expect(
        responses.find((response) => response.status === 401)?.body.message
      ).toBe('Refresh token has been revoked');
      expect(
        responses.find((response) => response.status === 200)?.headers[
          'set-cookie'
        ]
      ).toEqual(expect.any(Array));
    });

    it('revokes the refresh token and clears all session cookies on logout', async () => {
      const loginRes = await loginWithCookies();
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const refreshPair = cookiePair(cookies, REFRESH_COOKIE_NAME);
      const csrfPair = cookiePair(cookies, CSRF_COOKIE_NAME);

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `${refreshPair}; ${csrfPair}`)
        .set(CSRF_HEADER_NAME, cookieValue(csrfPair))
        .send({});
      const clearedCookies = logoutRes.headers[
        'set-cookie'
      ] as unknown as string[];

      expect(logoutRes.status).toBe(200);
      expect(clearedCookies).toEqual(
        expect.arrayContaining([
          expect.stringMatching(new RegExp(`^${ACCESS_COOKIE_NAME}=;`)),
          expect.stringMatching(new RegExp(`^${REFRESH_COOKIE_NAME}=;`)),
          expect.stringMatching(new RegExp(`^${CSRF_COOKIE_NAME}=;`)),
        ])
      );

      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: cookieValue(refreshPair) });
      expect(replayRes.status).toBe(401);
    });
  });

  // ============================
  // POST /api/v1/auth/refresh
  // ============================
  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register a user and get tokens
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Token User',
        email: 'token@example.com',
        password: 'password123',
      });
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('should return new token pair with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken);

      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(replayRes.status).toBe(401);
    });

    it('should return 400 if refresh token is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================
  // POST /api/v1/auth/logout
  // ============================
  describe('POST /api/v1/auth/logout', () => {
    it('should return success on logout with refresh token', async () => {
      // Register to get a token
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Logout User',
          email: 'logout@example.com',
          password: 'password123',
        });
      const refreshToken = registerRes.body.data.tokens.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should return success on logout without refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/logout').send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================
  // GET /api/v1/auth/profile
  // ============================
  describe('GET /api/v1/auth/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register a user and get tokens
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Profile User',
        email: 'profile@example.com',
        password: 'password123',
      });
      accessToken = res.body.data.tokens.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Profile User',
        email: 'profile@example.com',
        role: 'CUSTOMER',
      });
      expect(res.body.data.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access token is required');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

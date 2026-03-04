import request from 'supertest';
import app from '../../app';
import { setupTestDB, teardownTestDB, cleanDatabase } from '../setup';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';

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
            const pwError = res.body.errors.find((e: { field: string }) => e.field === 'password');
            expect(pwError).toBeDefined();
        });

        it('should return 400 if email format is invalid', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({ ...validUser, email: 'not-an-email' });

            expect(res.status).toBe(400);
            const emailError = res.body.errors.find((e: { field: string }) => e.field === 'email');
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
    // POST /api/v1/auth/refresh
    // ============================
    describe('POST /api/v1/auth/refresh', () => {
        let refreshToken: string;

        beforeEach(async () => {
            // Register a user and get tokens
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
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
        });

        it('should return 400 if refresh token is missing', async () => {
            const res = await request(app)
                .post('/api/v1/auth/refresh')
                .send({});

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
            const res = await request(app)
                .post('/api/v1/auth/logout')
                .send();

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
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
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
            const res = await request(app)
                .get('/api/v1/auth/profile');

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

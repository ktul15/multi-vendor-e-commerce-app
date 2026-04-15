import { register, login, refreshAccessToken, logout, getProfile } from '@modules/auth/auth.service';
import { prisma } from '@config/prisma';
import { setupTestDB, teardownTestDB, cleanDatabase } from '../../src/__tests__/setup';

beforeAll(setupTestDB);
afterAll(teardownTestDB);

// cleanDatabase runs once per describe block (not before every single test) to reduce
// the number of sequential DB round-trips. Each describe block gets a clean slate at
// the start; individual tests create their own data using unique identifiers.

describe('Auth Service — register()', () => {
    // Tests in this block use unique emails and are fully independent of each other.
    beforeAll(cleanDatabase);

    it('should create a user and return user profile + token pair', async () => {
        const result = await register({ name: 'Alice', email: 'alice@test.com', password: 'password123' });

        expect(result.user.email).toBe('alice@test.com');
        expect(result.user.name).toBe('Alice');
        expect(result.user.role).toBe('CUSTOMER');
        expect(result.user.id).toBeDefined();
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should store a hashed password (not the plain text)', async () => {
        await register({ name: 'Bob', email: 'bob@test.com', password: 'plaintext' });
        const stored = await prisma.user.findUnique({ where: { email: 'bob@test.com' } });

        expect(stored!.password).not.toBe('plaintext');
        expect(stored!.password).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
    });

    it('should throw 409 when email is already taken', async () => {
        await register({ name: 'Carol', email: 'carol@test.com', password: 'password123' });

        await expect(
            register({ name: 'Carol 2', email: 'carol@test.com', password: 'other123' })
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should create a VENDOR user with storeName and auto-create vendorProfile', async () => {
        const result = await register({
            name: 'Dave',
            email: 'dave@test.com',
            password: 'password123',
            role: 'VENDOR',
            storeName: 'Dave Store',
        });

        expect(result.user.role).toBe('VENDOR');

        const profile = await prisma.vendorProfile.findUnique({ where: { userId: result.user.id } });
        expect(profile).not.toBeNull();
        expect(profile!.storeName).toBe('Dave Store');
    });

    it('should default to CUSTOMER role when no role is provided', async () => {
        const result = await register({ name: 'Eve', email: 'eve@test.com', password: 'password123' });
        expect(result.user.role).toBe('CUSTOMER');
    });
});

describe('Auth Service — login()', () => {
    // Frank is registered once; isBanned is reset before each test to ensure
    // tests are order-independent (the isBanned test mutates frank).
    beforeAll(async () => {
        await cleanDatabase();
        await register({ name: 'Frank', email: 'frank@test.com', password: 'password123' });
    });

    beforeEach(async () => {
        // Reset isBanned so the banned-state test doesn't bleed into adjacent tests.
        await prisma.user.update({ where: { email: 'frank@test.com' }, data: { isBanned: false } });
    });

    it('should return user profile + token pair for valid credentials', async () => {
        const result = await login({ email: 'frank@test.com', password: 'password123' });

        expect(result.user.email).toBe('frank@test.com');
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw 401 for non-existent email', async () => {
        await expect(
            login({ email: 'nobody@test.com', password: 'password123' })
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 for wrong password', async () => {
        await expect(
            login({ email: 'frank@test.com', password: 'wrongpassword' })
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 403 when user isBanned is true', async () => {
        await prisma.user.update({ where: { email: 'frank@test.com' }, data: { isBanned: true } });

        await expect(
            login({ email: 'frank@test.com', password: 'password123' })
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

describe('Auth Service — refreshAccessToken()', () => {
    // Each test registers its own uniquely-named user; no shared mutable state.
    beforeAll(cleanDatabase);

    it('should return new accessToken and refreshToken for a valid refresh token', async () => {
        const { tokens } = await register({ name: 'Grace', email: 'grace@test.com', password: 'password123' });

        const newTokens = await refreshAccessToken(tokens.refreshToken);

        expect(newTokens.accessToken).toBeDefined();
        expect(newTokens.refreshToken).toBeDefined();
        expect(typeof newTokens.accessToken).toBe('string');
        expect(typeof newTokens.refreshToken).toBe('string');
    });

    it('should throw 401 for a malformed token string', async () => {
        await expect(
            refreshAccessToken('this-is-not-a-jwt')
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 401 when user is deleted between issuance and refresh', async () => {
        const { user, tokens } = await register({ name: 'Henry', email: 'henry@test.com', password: 'password123' });

        await prisma.user.delete({ where: { id: user.id } });

        await expect(
            refreshAccessToken(tokens.refreshToken)
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 403 when user is banned between issuance and refresh', async () => {
        const { user, tokens } = await register({ name: 'Iris', email: 'iris@test.com', password: 'password123' });

        await prisma.user.update({ where: { id: user.id }, data: { isBanned: true } });

        await expect(
            refreshAccessToken(tokens.refreshToken)
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw 401 for a blacklisted refresh token (logout then refresh)', async () => {
        const { tokens } = await register({ name: 'Jack', email: 'jack@test.com', password: 'password123' });

        await logout(tokens.refreshToken);

        await expect(
            refreshAccessToken(tokens.refreshToken)
        ).rejects.toMatchObject({ statusCode: 401 });
    });
});

describe('Auth Service — logout()', () => {
    beforeAll(cleanDatabase);

    it('should silently succeed for a valid token', async () => {
        const { tokens } = await register({ name: 'Kate', email: 'kate@test.com', password: 'password123' });

        await expect(logout(tokens.refreshToken)).resolves.toBeUndefined();
    });

    it('should not throw for a malformed/already-expired token', async () => {
        await expect(logout('not-a-valid-token')).resolves.toBeUndefined();
    });
});

describe('Auth Service — getProfile()', () => {
    beforeAll(cleanDatabase);

    it('should return user profile fields', async () => {
        const { user } = await register({ name: 'Liam', email: 'liam@test.com', password: 'password123' });

        const profile = await getProfile(user.id);

        expect(profile.id).toBe(user.id);
        expect(profile.email).toBe('liam@test.com');
        expect(profile.name).toBe('Liam');
        expect(profile.role).toBe('CUSTOMER');
        expect(profile.isVerified).toBe(false);
        expect(profile.avatar).toBeNull();
        expect(profile.createdAt).toBeInstanceOf(Date);
    });

    it('should throw 404 for a non-existent userId', async () => {
        await expect(
            getProfile('00000000-0000-0000-0000-000000000000')
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

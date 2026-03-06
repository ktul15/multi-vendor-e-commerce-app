import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

// The imported 'prisma' object is already instantiated correctly with the adapter.
let adminToken: string;

beforeAll(async () => {
    // 1. Clear categories
    await prisma.category.deleteMany({});

    // 2. Ensure test users exist
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@ecommerce.com' },
        update: { password: adminPassword, role: 'ADMIN' },
        create: {
            name: 'Admin User',
            email: 'admin@ecommerce.com',
            password: adminPassword,
            role: 'ADMIN',
            isVerified: true
        }
    });

    const vendorPassword = await bcrypt.hash('vendor123', 10);
    await prisma.user.upsert({
        where: { email: 'vendor@ecommerce.com' },
        update: { password: vendorPassword, role: 'VENDOR' },
        create: {
            name: 'Vendor User',
            email: 'vendor@ecommerce.com',
            password: vendorPassword,
            role: 'VENDOR',
            isVerified: true
        }
    });

    // 3. Trigger the admin token login
    const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@ecommerce.com', password: 'admin123' });

    adminToken = `Bearer ${res.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.category.deleteMany({});
    await prisma.$disconnect();
});

describe('Category API (Issue #19)', () => {
    let parentCategoryId: string;

    it('should allow ADMIN to create a root category', async () => {
        const res = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', adminToken)
            .send({
                name: 'Electronics',
                image: 'https://example.com/electronics.png',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Electronics');
        expect(res.body.data.slug).toBe('electronics');
        parentCategoryId = res.body.data.id;
    });

    it('should generate unique slugs for identical names', async () => {
        const res = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', adminToken)
            .send({
                name: 'Electronics',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.slug).toBe('electronics-1');
    });

    it('should allow ADMIN to create a subcategory', async () => {
        const res = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', adminToken)
            .send({
                name: 'Laptops',
                parentId: parentCategoryId,
            });

        expect(res.status).toBe(201);
        expect(res.body.data.parentId).toBe(parentCategoryId);
    });

    it('should return a nested tree of all categories on GET', async () => {
        const res = await request(app).get('/api/v1/categories');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1); // the root categories

        // Find our Electronics category
        const electronics = res.body.data.find((c: any) => c.name === 'Electronics');
        expect(electronics).toBeDefined();
        // It should have the nested 'Laptops' children
        expect(electronics.children.length).toBe(1);
        expect(electronics.children[0].name).toBe('Laptops');
    });

    it('should restrict unauthenticated/non-admin users from creating', async () => {
        // No token
        let res = await request(app)
            .post('/api/v1/categories')
            .send({ name: 'Hacked Category' });
        expect(res.status).toBe(401);

        // Vendor token (assuming vendor@ecommerce.com exists from seed)
        const vendorRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'vendor@ecommerce.com', password: 'vendor123' });

        const vendorToken = `Bearer ${vendorRes.body.data.tokens.accessToken}`;

        res = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', vendorToken)
            .send({ name: 'Vendor Category' });
        expect(res.status).toBe(403);
    });

    it('should allow ADMIN to update a category', async () => {
        const res = await request(app)
            .put(`/api/v1/categories/${parentCategoryId}`)
            .set('Authorization', adminToken)
            .send({
                name: 'Consumer Electronics',
            });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Consumer Electronics');
        expect(res.body.data.slug).toBe('consumer-electronics'); // slug should update when name updates
    });

    it('should prevent deleting a category that has children', async () => {
        const res = await request(app)
            .delete(`/api/v1/categories/${parentCategoryId}`)
            .set('Authorization', adminToken);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Cannot delete category with subcategories');
    });
});

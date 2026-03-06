import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

let vendorToken: string;
let vendorId: string;
let categoryId: string;
let customerToken: string;

beforeAll(async () => {
    // 1. Clear state
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    // 2. Setup standard users
    const password = await bcrypt.hash('test1234', 10);

    const vendorUser = await prisma.user.upsert({
        where: { email: 'vendor@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: {
            name: 'Vendor User',
            email: 'vendor@ecommerce.com',
            password,
            role: 'VENDOR',
            isVerified: true
        }
    });
    vendorId = vendorUser.id;

    await prisma.user.upsert({
        where: { email: 'customer@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: {
            name: 'Customer User',
            email: 'customer@ecommerce.com',
            password,
            role: 'CUSTOMER',
            isVerified: true
        }
    });

    // 3. Create a category for products
    const category = await prisma.category.create({
        data: {
            name: 'Books',
            slug: 'books-1',
        }
    });
    categoryId = category.id;

    // 4. Authenticate tokens
    const vendorRes = await request(app).post('/api/v1/auth/login').send({ email: 'vendor@ecommerce.com', password: 'test1234' });
    vendorToken = `Bearer ${vendorRes.body.data.tokens.accessToken}`;

    const customerRes = await request(app).post('/api/v1/auth/login').send({ email: 'customer@ecommerce.com', password: 'test1234' });
    customerToken = `Bearer ${customerRes.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.$disconnect();
});

describe('Product API (Issue #20)', () => {
    let productId: string;
    let variantId: string;

    describe('POST /api/v1/products', () => {
        it('should allow VENDOR to create a product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', vendorToken)
                .send({
                    categoryId,
                    name: 'The Great Gatsby',
                    description: 'A classic novel by F. Scott Fitzgerald.',
                    basePrice: 15.99,
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('The Great Gatsby');
            expect(res.body.data.vendorId).toBe(vendorId);
            productId = res.body.data.id;
        });

        it('should restrict unauthenticated/CUSTOMER users from creating products', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', customerToken)
                .send({
                    categoryId,
                    name: 'Hacked Book',
                    description: 'A hacked novel.',
                    basePrice: 5.99,
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('not authorized to access this resource');
        });
    });

    describe('GET /api/v1/products', () => {
        it('should list all products publicly', async () => {
            const res = await request(app).get('/api/v1/products');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data[0].name).toBe('The Great Gatsby');
            expect(res.body.data[0].vendor).toBeDefined();
            expect(res.body.data[0].category).toBeDefined();
        });

        it('should get a single product by ID', async () => {
            const res = await request(app).get(`/api/v1/products/${productId}`);
            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('The Great Gatsby');
        });
    });

    describe('PUT /api/v1/products/:id', () => {
        it('should allow VENDOR to update their own product', async () => {
            const res = await request(app)
                .put(`/api/v1/products/${productId}`)
                .set('Authorization', vendorToken)
                .send({
                    basePrice: 19.99,
                    tags: ['classic', 'fiction']
                });

            expect(res.status).toBe(200);
            expect(res.body.data.basePrice).toBe(19.99);
            expect(res.body.data.tags).toEqual(['classic', 'fiction']);
        });
    });

    describe('Variant Management', () => {
        it('should allow VENDOR to add a variant to their product', async () => {
            const res = await request(app)
                .post(`/api/v1/products/${productId}/variants`)
                .set('Authorization', vendorToken)
                .send({
                    sku: 'GATSBY-HARDCOVER',
                    price: 24.99,
                    stock: 50,
                    size: 'Hardcover'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.sku).toBe('GATSBY-HARDCOVER');
            expect(res.body.data.price).toBe(24.99);
            variantId = res.body.data.id;
        });

        it('should prevent duplicate SKUs when adding variants', async () => {
            const res = await request(app)
                .post(`/api/v1/products/${productId}/variants`)
                .set('Authorization', vendorToken)
                .send({
                    sku: 'GATSBY-HARDCOVER', // duplicate
                    price: 15.00,
                    stock: 10
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('SKU is already in use');
        });

        it('should allow VENDOR to update variant details', async () => {
            const res = await request(app)
                .put(`/api/v1/products/${productId}/variants/${variantId}`)
                .set('Authorization', vendorToken)
                .send({ stock: 45 });

            expect(res.status).toBe(200);
            expect(res.body.data.stock).toBe(45);
        });
    });

    describe('DELETE /api/v1/products/:id', () => {
        it('should allow VENDOR to delete their product and cascade variants', async () => {
            const res = await request(app)
                .delete(`/api/v1/products/${productId}`)
                .set('Authorization', vendorToken);

            expect(res.status).toBe(200);

            // Double check it's deleted
            const getRes = await request(app).get(`/api/v1/products/${productId}`);
            expect(getRes.status).toBe(404);

            // Variant should cascade delete
            const variantExists = await prisma.variant.findUnique({ where: { id: variantId } });
            expect(variantExists).toBeNull();
        });
    });
});

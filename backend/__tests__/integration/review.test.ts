import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

let customerToken: string;
let customerId: string;
let customer2Token: string;
let vendorId: string;
let productId: string;
let variantId: string;
let categoryId: string;

beforeAll(async () => {
    // 1. Clear state (order matters due to FK constraints)
    await prisma.review.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    // 2. Setup users
    const password = await bcrypt.hash('test1234', 10);

    const vendor = await prisma.user.upsert({
        where: { email: 'review-vendor@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: {
            name: 'Review Vendor',
            email: 'review-vendor@ecommerce.com',
            password,
            role: 'VENDOR',
            isVerified: true,
        },
    });
    vendorId = vendor.id;

    const customer = await prisma.user.upsert({
        where: { email: 'review-customer@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: {
            name: 'Review Customer',
            email: 'review-customer@ecommerce.com',
            password,
            role: 'CUSTOMER',
            isVerified: true,
        },
    });
    customerId = customer.id;

    await prisma.user.upsert({
        where: { email: 'review-customer2@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: {
            name: 'Review Customer 2',
            email: 'review-customer2@ecommerce.com',
            password,
            role: 'CUSTOMER',
            isVerified: true,
        },
    });

    // 3. Create category, product, variant
    const category = await prisma.category.create({
        data: { name: 'Review Test Category', slug: 'review-test-cat' },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
        data: {
            vendorId,
            categoryId,
            name: 'Review Test Product',
            description: 'A product for testing reviews',
            basePrice: 29.99,
            variants: {
                create: { size: 'M', price: 29.99, stock: 10, sku: 'REVIEW-TEST-001' },
            },
        },
        include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;

    // 4. Create a delivered order for customer (so they can review)
    const address = await prisma.address.create({
        data: {
            userId: customerId,
            fullName: 'Review Customer',
            phone: '1234567890',
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            country: 'US',
            zipCode: '12345',
        },
    });

    await prisma.order.create({
        data: {
            orderNumber: 'ORD-REVIEW-001',
            userId: customerId,
            addressId: address.id,
            shippingAddress: {
                fullName: 'Review Customer',
                street: '123 Test St',
                city: 'Test City',
                state: 'TS',
                country: 'US',
                zipCode: '12345',
            },
            subtotal: 29.99,
            total: 29.99,
            vendorOrders: {
                create: {
                    vendorId,
                    status: 'DELIVERED',
                    subtotal: 29.99,
                    items: {
                        create: {
                            variantId,
                            quantity: 1,
                            unitPrice: 29.99,
                            totalPrice: 29.99,
                        },
                    },
                },
            },
            payment: {
                create: {
                    amount: 29.99,
                    method: 'CARD',
                    status: 'SUCCEEDED',
                    paidAt: new Date(),
                },
            },
        },
    });

    // 5. Authenticate
    const customerRes = await request(app).post('/api/v1/auth/login').send({
        email: 'review-customer@ecommerce.com',
        password: 'test1234',
    });
    customerToken = `Bearer ${customerRes.body.data.tokens.accessToken}`;

    const customer2Res = await request(app).post('/api/v1/auth/login').send({
        email: 'review-customer2@ecommerce.com',
        password: 'test1234',
    });
    customer2Token = `Bearer ${customer2Res.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.review.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.$disconnect();
});

describe('Reviews API (Issue #41)', () => {
    let reviewId: string;

    describe('POST /api/v1/reviews', () => {
        it('should reject unauthenticated requests', async () => {
            const res = await request(app)
                .post('/api/v1/reviews')
                .send({ productId, rating: 5, comment: 'Great product!' });

            expect(res.status).toBe(401);
        });

        it('should reject review from user who has not purchased the product', async () => {
            const res = await request(app)
                .post('/api/v1/reviews')
                .set('Authorization', customer2Token)
                .send({ productId, rating: 5, comment: 'Great product!' });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should reject invalid rating', async () => {
            const res = await request(app)
                .post('/api/v1/reviews')
                .set('Authorization', customerToken)
                .send({ productId, rating: 6, comment: 'Great!' });

            expect(res.status).toBe(400);
        });

        it('should create a review for a purchased product', async () => {
            const res = await request(app)
                .post('/api/v1/reviews')
                .set('Authorization', customerToken)
                .send({ productId, rating: 4, comment: 'Good quality!' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.rating).toBe(4);
            expect(res.body.data.comment).toBe('Good quality!');
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.name).toBe('Review Customer');

            reviewId = res.body.data.id;
        });

        it('should update product avgRating and reviewCount after creating review', async () => {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            expect(product!.reviewCount).toBe(1);
            expect(Number(product!.avgRating)).toBe(4);
        });

        it('should reject duplicate review for the same product', async () => {
            const res = await request(app)
                .post('/api/v1/reviews')
                .set('Authorization', customerToken)
                .send({ productId, rating: 5, comment: 'Another review' });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/reviews/product/:productId', () => {
        it('should return reviews for a product (public)', async () => {
            const res = await request(app)
                .get(`/api/v1/reviews/product/${productId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.meta.total).toBe(1);
            expect(res.body.data.items[0].user.name).toBe('Review Customer');
        });

        it('should support rating filter', async () => {
            const res = await request(app)
                .get(`/api/v1/reviews/product/${productId}?rating=5`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
        });

        it('should return 404 for non-existent product', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .get(`/api/v1/reviews/product/${fakeId}`);

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/v1/reviews/my-reviews', () => {
        it('should return only the authenticated user reviews', async () => {
            const res = await request(app)
                .get('/api/v1/reviews/my-reviews')
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].product).toBeDefined();
        });

        it('should return empty for user with no reviews', async () => {
            const res = await request(app)
                .get('/api/v1/reviews/my-reviews')
                .set('Authorization', customer2Token);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
        });
    });

    describe('PUT /api/v1/reviews/:reviewId', () => {
        it('should reject update from non-owner', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customer2Token)
                .send({ rating: 1 });

            expect(res.status).toBe(403);
        });

        it('should require at least one field', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customerToken)
                .send({});

            expect(res.status).toBe(400);
        });

        it('should update rating and recalculate product avg', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customerToken)
                .send({ rating: 5 });

            expect(res.status).toBe(200);
            expect(res.body.data.rating).toBe(5);

            const product = await prisma.product.findUnique({ where: { id: productId } });
            expect(Number(product!.avgRating)).toBe(5);
        });

        it('should allow setting comment to null', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customerToken)
                .send({ comment: null });

            expect(res.status).toBe(200);
            expect(res.body.data.comment).toBeNull();
        });
    });

    describe('DELETE /api/v1/reviews/:reviewId', () => {
        it('should reject delete from non-owner', async () => {
            const res = await request(app)
                .delete(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customer2Token);

            expect(res.status).toBe(403);
        });

        it('should delete review and update product aggregates', async () => {
            const res = await request(app)
                .delete(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(204);

            const product = await prisma.product.findUnique({ where: { id: productId } });
            expect(product!.reviewCount).toBe(0);
            expect(Number(product!.avgRating)).toBe(0);
        });

        it('should return 404 for already deleted review', async () => {
            const res = await request(app)
                .delete(`/api/v1/reviews/${reviewId}`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(404);
        });
    });
});

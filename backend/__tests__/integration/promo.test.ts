import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

let adminToken: string;
let customerToken: string;
let customerId: string;
let vendorToken: string;

beforeAll(async () => {
    // Clear in FK-safe order
    await prisma.promoUsage.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.promoCode.deleteMany({});
    await prisma.address.deleteMany({});

    const password = await bcrypt.hash('test1234', 10);

    // Upsert users
    await prisma.user.upsert({
        where: { email: 'admin.promo@ecommerce.com' },
        update: { password, role: 'ADMIN' },
        create: { name: 'Admin User', email: 'admin.promo@ecommerce.com', password, role: 'ADMIN', isVerified: true },
    });

    const customer = await prisma.user.upsert({
        where: { email: 'customer.promo@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: { name: 'Promo Customer', email: 'customer.promo@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customerId = customer.id;

    await prisma.user.upsert({
        where: { email: 'vendor.promo@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: { name: 'Promo Vendor', email: 'vendor.promo@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });

    // Get tokens via login
    const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin.promo@ecommerce.com', password: 'test1234' });
    adminToken = `Bearer ${adminLogin.body.data.tokens.accessToken}`;

    const customerLogin = await request(app).post('/api/v1/auth/login').send({ email: 'customer.promo@ecommerce.com', password: 'test1234' });
    customerToken = `Bearer ${customerLogin.body.data.tokens.accessToken}`;

    const vendorLogin = await request(app).post('/api/v1/auth/login').send({ email: 'vendor.promo@ecommerce.com', password: 'test1234' });
    vendorToken = `Bearer ${vendorLogin.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.promoUsage.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.promoCode.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.$disconnect();
});

describe('Promo Code Admin CRUD', () => {
    let promoId: string;

    describe('POST /api/v1/promo-codes', () => {
        it('should create a percentage promo code', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', adminToken)
                .send({
                    code: 'SAVE20',
                    discountType: 'PERCENTAGE',
                    discountValue: 20,
                    maxDiscount: 50,
                    usageLimit: 100,
                    perUserLimit: 2,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.code).toBe('SAVE20');
            expect(res.body.data.discountType).toBe('PERCENTAGE');
            expect(res.body.data.perUserLimit).toBe(2);
            promoId = res.body.data.id;
        });

        it('should create a fixed discount promo code', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', adminToken)
                .send({
                    code: 'flat10',
                    discountType: 'FIXED',
                    discountValue: 10,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.code).toBe('FLAT10'); // normalized to uppercase
            expect(res.body.data.discountType).toBe('FIXED');
        });

        it('should reject duplicate code', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', adminToken)
                .send({
                    code: 'SAVE20',
                    discountType: 'PERCENTAGE',
                    discountValue: 10,
                });

            expect(res.status).toBe(409);
        });

        it('should reject percentage > 100', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', adminToken)
                .send({
                    code: 'TOOBIG',
                    discountType: 'PERCENTAGE',
                    discountValue: 150,
                });

            expect(res.status).toBe(400);
        });

        it('should reject non-admin users', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', customerToken)
                .send({
                    code: 'NOPE',
                    discountType: 'FIXED',
                    discountValue: 5,
                });

            expect(res.status).toBe(403);
        });

        it('should reject unauthenticated requests', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .send({
                    code: 'NOPE',
                    discountType: 'FIXED',
                    discountValue: 5,
                });

            expect(res.status).toBe(401);
        });

        it('should reject vendor users', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', vendorToken)
                .send({
                    code: 'NOPE',
                    discountType: 'FIXED',
                    discountValue: 5,
                });

            expect(res.status).toBe(403);
        });

        it('should reject expired date', async () => {
            const res = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', adminToken)
                .send({
                    code: 'EXPIRED',
                    discountType: 'FIXED',
                    discountValue: 5,
                    expiresAt: new Date(Date.now() - 1000).toISOString(),
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/promo-codes', () => {
        it('should list promo codes with pagination', async () => {
            const res = await request(app)
                .get('/api/v1/promo-codes')
                .set('Authorization', adminToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
            expect(res.body.data.meta).toHaveProperty('total');
            expect(res.body.data.meta).toHaveProperty('page');
        });

        it('should filter by search', async () => {
            const res = await request(app)
                .get('/api/v1/promo-codes?search=SAVE')
                .set('Authorization', adminToken);

            expect(res.status).toBe(200);
            expect(res.body.data.items.length).toBe(1);
            expect(res.body.data.items[0].code).toBe('SAVE20');
        });

        it('should filter by discountType', async () => {
            const res = await request(app)
                .get('/api/v1/promo-codes?discountType=FIXED')
                .set('Authorization', adminToken);

            expect(res.status).toBe(200);
            res.body.data.items.forEach((item: { discountType: string }) => {
                expect(item.discountType).toBe('FIXED');
            });
        });

        it('should reject non-admin', async () => {
            const res = await request(app)
                .get('/api/v1/promo-codes')
                .set('Authorization', customerToken);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/v1/promo-codes/:id', () => {
        it('should get promo code by id with usage stats', async () => {
            const res = await request(app)
                .get(`/api/v1/promo-codes/${promoId}`)
                .set('Authorization', adminToken);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(promoId);
            expect(res.body.data._count).toHaveProperty('orders');
            expect(res.body.data._count).toHaveProperty('usages');
        });

        it('should return 404 for non-existent id', async () => {
            const res = await request(app)
                .get('/api/v1/promo-codes/00000000-0000-0000-0000-000000000000')
                .set('Authorization', adminToken);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/v1/promo-codes/:id', () => {
        it('should update promo code fields', async () => {
            const res = await request(app)
                .put(`/api/v1/promo-codes/${promoId}`)
                .set('Authorization', adminToken)
                .send({ discountValue: 25, perUserLimit: 3 });

            expect(res.status).toBe(200);
            expect(Number(res.body.data.discountValue)).toBe(25);
            expect(res.body.data.perUserLimit).toBe(3);
        });

        it('should reject empty update', async () => {
            const res = await request(app)
                .put(`/api/v1/promo-codes/${promoId}`)
                .set('Authorization', adminToken)
                .send({});

            expect(res.status).toBe(400);
        });

        it('should reject percentage > 100 on update', async () => {
            const res = await request(app)
                .put(`/api/v1/promo-codes/${promoId}`)
                .set('Authorization', adminToken)
                .send({ discountValue: 150 });

            expect(res.status).toBe(400);
        });

        it('should reject duplicate code on update', async () => {
            const res = await request(app)
                .put(`/api/v1/promo-codes/${promoId}`)
                .set('Authorization', adminToken)
                .send({ code: 'FLAT10' });

            expect(res.status).toBe(409);
        });

        it('should return 404 for non-existent id', async () => {
            const res = await request(app)
                .put('/api/v1/promo-codes/00000000-0000-0000-0000-000000000000')
                .set('Authorization', adminToken)
                .send({ discountValue: 10 });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/v1/promo-codes/:id', () => {
        it('should soft delete (deactivate) promo code', async () => {
            // Create a disposable promo
            const createRes = await request(app)
                .post('/api/v1/promo-codes')
                .set('Authorization', adminToken)
                .send({
                    code: 'DELETEME',
                    discountType: 'FIXED',
                    discountValue: 1,
                });

            const deleteRes = await request(app)
                .delete(`/api/v1/promo-codes/${createRes.body.data.id}`)
                .set('Authorization', adminToken);

            expect(deleteRes.status).toBe(200);

            // Verify soft deleted
            const getRes = await request(app)
                .get(`/api/v1/promo-codes/${createRes.body.data.id}`)
                .set('Authorization', adminToken);

            expect(getRes.body.data.isActive).toBe(false);
        });

        it('should return 404 for non-existent id', async () => {
            const res = await request(app)
                .delete('/api/v1/promo-codes/00000000-0000-0000-0000-000000000000')
                .set('Authorization', adminToken);

            expect(res.status).toBe(404);
        });
    });
});

describe('Per-User Usage Tracking', () => {
    let variantId: string;
    let addressId: string;
    let perUserPromoCode: string;

    beforeAll(async () => {
        // Create a promo with perUserLimit = 1
        await prisma.promoCode.create({
            data: {
                code: 'ONCE',
                discountType: 'FIXED',
                discountValue: 5,
                perUserLimit: 1,
                isActive: true,
            },
        });
        perUserPromoCode = 'ONCE';

        // Create product and variant for ordering
        const vendor = await prisma.user.findFirst({ where: { email: 'vendor.promo@ecommerce.com' } });
        const category = await prisma.category.create({
            data: { name: 'Promo Test Cat', slug: 'promo-test-cat' },
        });
        const product = await prisma.product.create({
            data: {
                vendorId: vendor!.id,
                categoryId: category.id,
                name: 'Promo Test Product',
                description: 'Test product for promo tests',
                basePrice: 100,
                images: ['https://example.com/img.jpg'],
                variants: {
                    create: {
                        sku: 'PROMO-TST-001',
                        price: 100,
                        stock: 100,
                    },
                },
            },
            include: { variants: true },
        });
        variantId = product.variants[0].id;

        // Create address for customer
        const address = await prisma.address.create({
            data: {
                userId: customerId,
                fullName: 'Promo Tester',
                phone: '1234567890',
                street: '123 Promo St',
                city: 'Test City',
                state: 'TS',
                country: 'US',
                zipCode: '12345',
            },
        });
        addressId = address.id;
    });

    it('should allow first use of per-user-limited promo', async () => {
        // Add item to cart
        await request(app)
            .post('/api/v1/cart/items')
            .set('Authorization', customerToken)
            .send({ variantId, quantity: 1 });

        // Place order with promo
        const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', customerToken)
            .send({ addressId, promoCode: perUserPromoCode });

        expect(res.status).toBe(201);
        expect(Number(res.body.data.discount)).toBeGreaterThan(0);

        // Verify promo usage record was created
        const usage = await prisma.promoUsage.findFirst({
            where: { userId: customerId, orderId: res.body.data.id },
        });
        expect(usage).not.toBeNull();
    });

    it('should reject second use of per-user-limited promo', async () => {
        // Add item to cart again
        await request(app)
            .post('/api/v1/cart/items')
            .set('Authorization', customerToken)
            .send({ variantId, quantity: 1 });

        // Try ordering with same promo
        const res = await request(app)
            .post('/api/v1/orders')
            .set('Authorization', customerToken)
            .send({ addressId, promoCode: perUserPromoCode });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('maximum number of times');
    });

    it('should reject per-user-limited promo in cart preview too', async () => {
        const res = await request(app)
            .post('/api/v1/cart/preview-promo')
            .set('Authorization', customerToken)
            .send({ code: perUserPromoCode });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('maximum number of times');
    });
});

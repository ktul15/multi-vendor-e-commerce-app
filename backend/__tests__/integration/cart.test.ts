import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

let customerToken: string;
let customerId: string;
let customer2Token: string;
let variantId: string;
let inactiveProductVariantId: string; // variant belonging to an inactive product
let zeroStockVariantId: string;       // variant of an active product with stock=0

beforeAll(async () => {
    // Clear in FK-safe order
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.promoUsage.deleteMany({});
    await prisma.promoCode.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    const password = await bcrypt.hash('test1234', 10);

    const customer = await prisma.user.upsert({
        where: { email: 'customer.cart@ecommerce.com' },
        update: { password, role: 'CUSTOMER', isBanned: false },
        create: { name: 'Cart Customer', email: 'customer.cart@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customerId = customer.id;

    await prisma.user.upsert({
        where: { email: 'customer2.cart@ecommerce.com' },
        update: { password, role: 'CUSTOMER', isBanned: false },
        create: { name: 'Cart Customer 2', email: 'customer2.cart@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });

    const vendor = await prisma.user.upsert({
        where: { email: 'vendor.cart@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: { name: 'Cart Vendor', email: 'vendor.cart@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });

    const category = await prisma.category.create({
        data: { name: 'Cart Test Category', slug: 'cart-test-category' },
    });

    const product = await prisma.product.create({
        data: {
            vendorId: vendor.id,
            categoryId: category.id,
            name: 'Cart Test Product',
            description: 'A product for cart tests',
            basePrice: 25,
            images: [],
            isActive: true,
        },
    });

    const inactiveProduct = await prisma.product.create({
        data: {
            vendorId: vendor.id,
            categoryId: category.id,
            name: 'Inactive Product',
            description: 'Inactive product for cart tests',
            basePrice: 10,
            images: [],
            isActive: false,
        },
    });

    const zeroStockProduct = await prisma.product.create({
        data: {
            vendorId: vendor.id,
            categoryId: category.id,
            name: 'Zero Stock Product',
            description: 'Active product with zero stock',
            basePrice: 15,
            images: [],
            isActive: true,
        },
    });

    const variant = await prisma.variant.create({
        data: { productId: product.id, size: 'M', color: 'Blue', price: 25, stock: 10, sku: 'CART-SKU-001' },
    });
    variantId = variant.id;

    const inactiveVariant = await prisma.variant.create({
        data: { productId: inactiveProduct.id, size: 'M', color: 'Red', price: 10, stock: 5, sku: 'CART-SKU-INACTIVE' },
    });
    inactiveProductVariantId = inactiveVariant.id;

    const zeroStockVariant = await prisma.variant.create({
        data: { productId: zeroStockProduct.id, size: 'S', color: 'White', price: 15, stock: 0, sku: 'CART-SKU-ZERO' },
    });
    zeroStockVariantId = zeroStockVariant.id;

    // Login
    const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer.cart@ecommerce.com', password: 'test1234' });
    customerToken = `Bearer ${res.body.data.tokens.accessToken}`;

    const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer2.cart@ecommerce.com', password: 'test1234' });
    customer2Token = `Bearer ${res2.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.promoUsage.deleteMany({});
    await prisma.promoCode.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    // Clean up the users created by this suite
    await prisma.user.deleteMany({
        where: { email: { in: ['customer.cart@ecommerce.com', 'customer2.cart@ecommerce.com', 'vendor.cart@ecommerce.com'] } },
    });
    await prisma.$disconnect();
});

// Helper: clear just cart items between tests that need a fresh cart
async function clearCustomerCart() {
    const cart = await prisma.cart.findUnique({ where: { userId: customerId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

describe('Cart API (Issue #61)', () => {

    describe('GET /api/v1/cart', () => {
        it('should return 401 without auth token', async () => {
            const res = await request(app).get('/api/v1/cart');
            expect(res.status).toBe(401);
        });

        it('should return an empty cart (upsert creates cart) for a new user', async () => {
            await clearCustomerCart();
            const res = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.subtotal).toBe(0);
        });

        it('should return cart with items and correct subtotal', async () => {
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 2 });

            const res = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.subtotal).toBe(50); // 2 * $25
            await clearCustomerCart();
        });
    });

    describe('POST /api/v1/cart/items', () => {
        beforeEach(clearCustomerCart);

        it('should return 401 without auth token', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .send({ variantId, quantity: 1 });
            expect(res.status).toBe(401);
        });

        it('should return 400 for invalid UUID variantId', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId: 'not-a-uuid', quantity: 1 });
            expect(res.status).toBe(400);
        });

        it('should return 400 for quantity less than 1', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 0 });
            expect(res.status).toBe(400);
        });

        it('should add an item and return cart with correct subtotal', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 3 });

            expect(res.status).toBe(201);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].quantity).toBe(3);
            expect(res.body.data.subtotal).toBe(75); // 3 * $25
        });

        it('should increment quantity when the same variant is added again', async () => {
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 2 });

            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 3 });

            expect(res.status).toBe(201);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].quantity).toBe(5);
        });

        it('should return 404 when variantId does not exist', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId: '00000000-0000-0000-0000-000000000000', quantity: 1 });
            expect(res.status).toBe(404);
        });

        it('should return 400 when product is inactive', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId: inactiveProductVariantId, quantity: 1 });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/no longer available/i);
        });

        it('should return 400 when variant stock is 0 (active product, zero stock)', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId: zeroStockVariantId, quantity: 1 });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/insufficient stock/i);
        });

        it('should return 400 when requested quantity exceeds available stock', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 99 }); // stock is 10
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/insufficient stock/i);
        });

        it('should return 400 when existing + new quantity exceeds stock', async () => {
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 8 });

            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 5 }); // 8 + 5 = 13 > 10
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/insufficient stock/i);
        });
    });

    describe('PUT /api/v1/cart/items/:itemId', () => {
        let itemId: string;

        beforeEach(async () => {
            await clearCustomerCart();
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 2 });
            itemId = res.body.data.items[0].id;
        });

        it('should return 401 without auth token', async () => {
            const res = await request(app)
                .put(`/api/v1/cart/items/${itemId}`)
                .send({ quantity: 3 });
            expect(res.status).toBe(401);
        });

        it('should return 400 for invalid UUID itemId param', async () => {
            const res = await request(app)
                .put('/api/v1/cart/items/not-a-uuid')
                .set('Authorization', customerToken)
                .send({ quantity: 1 });
            expect(res.status).toBe(400);
        });

        it('should update item quantity and return recalculated subtotal', async () => {
            const res = await request(app)
                .put(`/api/v1/cart/items/${itemId}`)
                .set('Authorization', customerToken)
                .send({ quantity: 4 });

            expect(res.status).toBe(200);
            expect(res.body.data.items[0].quantity).toBe(4);
            expect(res.body.data.subtotal).toBe(100); // 4 * $25
        });

        it('should return 404 for a non-existent itemId', async () => {
            const res = await request(app)
                .put('/api/v1/cart/items/00000000-0000-0000-0000-000000000000')
                .set('Authorization', customerToken)
                .send({ quantity: 1 });
            expect(res.status).toBe(404);
        });

        it('should return 404 when itemId belongs to another user', async () => {
            const res = await request(app)
                .put(`/api/v1/cart/items/${itemId}`)
                .set('Authorization', customer2Token)
                .send({ quantity: 1 });
            expect(res.status).toBe(404);
        });

        it('should return 400 when new quantity exceeds available stock', async () => {
            const res = await request(app)
                .put(`/api/v1/cart/items/${itemId}`)
                .set('Authorization', customerToken)
                .send({ quantity: 99 }); // stock is 10
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/insufficient stock/i);
        });
    });

    describe('DELETE /api/v1/cart/items/:itemId', () => {
        let itemId: string;

        beforeEach(async () => {
            await clearCustomerCart();
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 1 });
            itemId = res.body.data.items[0].id;
        });

        it('should return 401 without auth token', async () => {
            const res = await request(app).delete(`/api/v1/cart/items/${itemId}`);
            expect(res.status).toBe(401);
        });

        it('should remove the item from the cart', async () => {
            const res = await request(app)
                .delete(`/api/v1/cart/items/${itemId}`)
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
        });

        it('should return 404 for a non-existent itemId', async () => {
            const res = await request(app)
                .delete('/api/v1/cart/items/00000000-0000-0000-0000-000000000000')
                .set('Authorization', customerToken);
            expect(res.status).toBe(404);
        });

        it('should return 404 when itemId belongs to another user', async () => {
            const res = await request(app)
                .delete(`/api/v1/cart/items/${itemId}`)
                .set('Authorization', customer2Token);
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/v1/cart', () => {
        it('should return 401 without auth token', async () => {
            const res = await request(app).delete('/api/v1/cart');
            expect(res.status).toBe(401);
        });

        it('should clear all items from the cart', async () => {
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 2 });

            const res = await request(app)
                .delete('/api/v1/cart')
                .set('Authorization', customerToken);

            expect(res.status).toBe(200);

            const cartRes = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', customerToken);
            expect(cartRes.body.data.items).toHaveLength(0);
        });

        it('should succeed when cart is already empty', async () => {
            await clearCustomerCart();
            const res = await request(app)
                .delete('/api/v1/cart')
                .set('Authorization', customerToken);
            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/v1/cart/preview-promo', () => {
        let promoId: string;

        beforeAll(async () => {
            // Seed promo codes (once — they don't change between tests)
            const promo = await prisma.promoCode.create({
                data: {
                    code: 'CART10',
                    discountType: 'PERCENTAGE',
                    discountValue: 10,
                    minOrderValue: 20,
                    maxDiscount: 5,
                    usageLimit: 100,
                    isActive: true,
                },
            });
            promoId = promo.id;

            await prisma.promoCode.create({
                data: {
                    code: 'FLAT5',
                    discountType: 'FIXED',
                    discountValue: 5,
                    isActive: true,
                },
            });

            await prisma.promoCode.create({
                data: {
                    code: 'INACTIVE',
                    discountType: 'PERCENTAGE',
                    discountValue: 20,
                    isActive: false,
                },
            });

            await prisma.promoCode.create({
                data: {
                    code: 'EXPIRED',
                    discountType: 'PERCENTAGE',
                    discountValue: 20,
                    isActive: true,
                    expiresAt: new Date('2020-01-01'),
                },
            });

            await prisma.promoCode.create({
                data: {
                    code: 'MAXUSED',
                    discountType: 'PERCENTAGE',
                    discountValue: 20,
                    isActive: true,
                    usageLimit: 5,
                    usageCount: 5,
                },
            });

            await prisma.promoCode.create({
                data: {
                    code: 'MINORDER',
                    discountType: 'PERCENTAGE',
                    discountValue: 10,
                    isActive: true,
                    minOrderValue: 1000,
                },
            });

        });

        // Ensure the cart has 2 items before each promo test.
        // The "empty cart" test clears it; beforeEach restores it for the next test.
        beforeEach(async () => {
            await clearCustomerCart();
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 2 });
        });

        it('should return 401 without auth token', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .send({ code: 'CART10' });
            expect(res.status).toBe(401);
        });

        it('should return 400 when code field is missing', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({});
            expect(res.status).toBe(400);
        });

        it('should return correct discountAmount for PERCENTAGE promo (with maxDiscount cap)', async () => {
            // 10% of $50 = $5, but maxDiscount = $5, so discountAmount = $5
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'CART10' });

            expect(res.status).toBe(200);
            expect(res.body.data.discountType).toBe('PERCENTAGE');
            expect(res.body.data.subtotal).toBe(50);
            expect(res.body.data.discountAmount).toBe(5);
            expect(res.body.data.total).toBe(45);
        });

        it('should return correct discountAmount for FLAT promo', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'FLAT5' });

            expect(res.status).toBe(200);
            expect(res.body.data.discountType).toBe('FIXED');
            expect(res.body.data.discountAmount).toBe(5);
            expect(res.body.data.total).toBe(45);
        });

        it('should return 400 when cart is empty', async () => {
            // Clear the cart that beforeEach just seeded
            await clearCustomerCart();
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'CART10' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/cart is empty/i);
            // beforeEach restores the cart for subsequent tests — no inline restoration needed
        });

        it('should return 404 when promo code does not exist', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'NONEXISTENT' });
            expect(res.status).toBe(404);
        });

        it('should return 400 when promo code is inactive', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'INACTIVE' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/inactive/i);
        });

        it('should return 400 when promo code has expired', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'EXPIRED' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/expired/i);
        });

        it('should return 400 when promo usageLimit is reached', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'MAXUSED' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/usage limit/i);
        });

        it('should return 400 when subtotal is below minOrderValue', async () => {
            const res = await request(app)
                .post('/api/v1/cart/preview-promo')
                .set('Authorization', customerToken)
                .send({ code: 'MINORDER' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/minimum order/i);
        });

        afterAll(async () => {
            await prisma.promoCode.deleteMany({ where: { code: { in: ['CART10', 'FLAT5', 'INACTIVE', 'EXPIRED', 'MAXUSED', 'MINORDER'] } } });
        });
    });
});

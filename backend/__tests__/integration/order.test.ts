import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

let customerToken: string;
let customerId: string;
let customer2Token: string;
let customer2Id: string;
let variantId: string;
let variant2Id: string;
let addressId: string;
let customer2AddressId: string;
let promoCodeId: string;

beforeAll(async () => {
    // Clear in FK-safe order
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
    const vendor = await prisma.user.upsert({
        where: { email: 'vendor.order@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: { name: 'Vendor User', email: 'vendor.order@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });

    const customer = await prisma.user.upsert({
        where: { email: 'customer.order@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: { name: 'Order Customer', email: 'customer.order@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customerId = customer.id;

    const customer2 = await prisma.user.upsert({
        where: { email: 'customer2.order@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: { name: 'Order Customer 2', email: 'customer2.order@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customer2Id = customer2.id;

    // Create category
    const category = await prisma.category.create({
        data: { name: 'Order Test Category', slug: 'order-test-category' },
    });

    // Create product and variants
    const product = await prisma.product.create({
        data: {
            vendorId: vendor.id,
            categoryId: category.id,
            name: 'Order Test Product',
            description: 'A product for order tests',
            basePrice: 50,
            images: [],
            isActive: true,
        },
    });

    const variant = await prisma.variant.create({
        data: { productId: product.id, size: 'M', color: 'Red', price: 50, stock: 10, sku: 'ORDER-SKU-001' },
    });
    variantId = variant.id;

    const variant2 = await prisma.variant.create({
        data: { productId: product.id, size: 'L', color: 'Blue', price: 75, stock: 5, sku: 'ORDER-SKU-002' },
    });
    variant2Id = variant2.id;

    // Create promo code
    const promo = await prisma.promoCode.create({
        data: {
            code: 'SAVE10',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minOrderValue: 50,
            maxDiscount: 20,
            usageLimit: 5,
            isActive: true,
        },
    });
    promoCodeId = promo.id;

    // Create address for customer
    const address = await prisma.address.create({
        data: {
            userId: customerId,
            fullName: 'Order Customer',
            phone: '555-1234',
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            country: 'US',
            zipCode: '62701',
        },
    });
    addressId = address.id;

    // Create address for customer2
    const address2 = await prisma.address.create({
        data: {
            userId: customer2Id,
            fullName: 'Customer Two',
            phone: '555-5678',
            street: '456 Oak Ave',
            city: 'Chicago',
            state: 'IL',
            country: 'US',
            zipCode: '60601',
        },
    });
    customer2AddressId = address2.id;

    // Get tokens
    const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer.order@ecommerce.com', password: 'test1234' });
    customerToken = `Bearer ${res.body.data.tokens.accessToken}`;

    const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer2.order@ecommerce.com', password: 'test1234' });
    customer2Token = `Bearer ${res2.body.data.tokens.accessToken}`;

    // Seed cart for customer: 2x variant ($50 each) + 1x variant2 ($75) = $175 subtotal
    await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', customerToken)
        .send({ variantId, quantity: 2 });

    await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', customerToken)
        .send({ variantId: variant2Id, quantity: 1 });
});

afterAll(async () => {
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

describe('Order API (Issue #31)', () => {
    describe('POST /api/v1/orders', () => {
        it('should return 401 without auth', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .send({ addressId });
            expect(res.status).toBe(401);
        });

        it('should return 400 for empty cart (customer2)', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customer2Token)
                .send({ addressId: customer2AddressId });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/cart is empty/i);
        });

        it('should return 404 for non-existent addressId', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customerToken)
                .send({ addressId: '00000000-0000-0000-0000-000000000000' });

            expect(res.status).toBe(404);
        });

        it('should return 400 for invalid UUID addressId', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customerToken)
                .send({ addressId: 'not-a-uuid' });

            expect(res.status).toBe(400);
        });

        it('should return 404 for non-existent promoCode', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customerToken)
                .send({ addressId, promoCode: 'DOESNOTEXIST' });

            expect(res.status).toBe(404);
        });

        it('should create an order and decrement stock and clear cart (happy path)', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customerToken)
                .send({ addressId });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Order placed successfully');

            const order = res.body.data;
            // orderNumber format: ORD-YYYYMMDD-XXXXXXXX (8 hex chars from crypto.randomBytes(4))
            expect(order.orderNumber).toMatch(/^ORD-\d{8}-[0-9A-F]{8}$/);
            expect(Number(order.subtotal)).toBe(175);
            expect(Number(order.discount)).toBe(0);
            expect(Number(order.total)).toBe(175);
            expect(order.vendorOrders).toHaveLength(1);
            expect(order.vendorOrders[0].items).toHaveLength(2);
            expect(order.shippingAddress.fullName).toBe('Order Customer');

            // Stock decremented atomically in the same transaction
            const v1 = await prisma.variant.findUnique({ where: { id: variantId } });
            const v2 = await prisma.variant.findUnique({ where: { id: variant2Id } });
            expect(v1!.stock).toBe(8);
            expect(v2!.stock).toBe(4);

            // Cart cleared in the same transaction
            const cartRes = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', customerToken);
            expect(cartRes.status).toBe(200);
            expect(cartRes.body.data.items).toHaveLength(0);
        });

        it('should create order with promo code and increment usageCount atomically', async () => {
            // Re-seed cart: 2x$50 + 1x$75 = $175 subtotal
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId, quantity: 2 });

            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', customerToken)
                .send({ variantId: variant2Id, quantity: 1 });

            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customerToken)
                .send({ addressId, promoCode: 'SAVE10' });

            expect(res.status).toBe(201);
            const order = res.body.data;
            // SAVE10 = 10% of 175 = 17.5 (under maxDiscount of 20)
            expect(Number(order.subtotal)).toBe(175);
            expect(Number(order.discount)).toBe(17.5);
            expect(Number(order.total)).toBe(157.5);
            expect(order.promoCode.code).toBe('SAVE10');

            const promo = await prisma.promoCode.findUnique({ where: { id: promoCodeId } });
            expect(promo!.usageCount).toBe(1);
        });

        it('should return 400 for insufficient stock (direct DB cart insert)', async () => {
            // Directly insert an oversized cart item bypassing the cart API stock check
            const cart = await prisma.cart.findUnique({ where: { userId: customerId } });

            // variant2 now has stock=3; request quantity=10 to force the failure
            await prisma.cartItem.upsert({
                where: { cartId_variantId: { cartId: cart!.id, variantId: variant2Id } },
                create: { cartId: cart!.id, variantId: variant2Id, quantity: 10 },
                update: { quantity: 10 },
            });

            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', customerToken)
                .send({ addressId });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/insufficient stock/i);

            // Clean up the bad cart item so it doesn't affect later tests
            await prisma.cartItem.deleteMany({ where: { cartId: cart!.id } });
        });
    });
});

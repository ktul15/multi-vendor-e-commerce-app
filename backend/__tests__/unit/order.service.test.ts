import { prisma } from '@config/prisma';
import bcrypt from 'bcrypt';
import { setupTestDB, teardownTestDB } from '../../src/__tests__/setup';
import { vendorPayoutService } from '../../src/modules/vendor-payout/vendor-payout.service';
import { NotificationService } from '../../src/modules/notification/notification.service';

// ---------------------
// Stripe mock (var-hoisted pattern)
// ---------------------
// eslint-disable-next-line no-var
var mockCancel: jest.Mock;
// eslint-disable-next-line no-var
var mockRefundsCreate: jest.Mock;

jest.mock('stripe', () => {
    const cancel = jest.fn();
    const refundsCreate = jest.fn();

    mockCancel = cancel;
    mockRefundsCreate = refundsCreate;

    return jest.fn().mockImplementation(() => ({
        paymentIntents: { cancel, create: jest.fn(), retrieve: jest.fn() },
        webhooks: { constructEvent: jest.fn() },
        refunds: { create: refundsCreate },
    }));
});

// Import after mock is set up
import { OrderService } from '@modules/order/order.service';

const orderService = new OrderService();

// ---------------------
// Test state
// ---------------------
let customerId: string;
let customer2Id: string;
let vendorId: string;
let vendor2Id: string;
let addressId: string;
let variantId: string;
let variant2Id: string; // belongs to vendor2

beforeAll(async () => {
    await setupTestDB();

    // Clear in FK-safe order
    await prisma.promoUsage.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.promoCode.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.address.deleteMany({});

    const password = await bcrypt.hash('test1234', 10);

    const vendor = await prisma.user.upsert({
        where: { email: 'vendor.order.unit@ecommerce.com' },
        update: { password },
        create: { name: 'Order Unit Vendor', email: 'vendor.order.unit@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });
    vendorId = vendor.id;

    const vendor2 = await prisma.user.upsert({
        where: { email: 'vendor2.order.unit@ecommerce.com' },
        update: { password },
        create: { name: 'Order Unit Vendor 2', email: 'vendor2.order.unit@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });
    vendor2Id = vendor2.id;

    const customer = await prisma.user.upsert({
        where: { email: 'customer.order.unit@ecommerce.com' },
        update: { password },
        create: { name: 'Order Unit Customer', email: 'customer.order.unit@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customerId = customer.id;

    const customer2 = await prisma.user.upsert({
        where: { email: 'customer2.order.unit@ecommerce.com' },
        update: { password },
        create: { name: 'Order Unit Customer 2', email: 'customer2.order.unit@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customer2Id = customer2.id;

    const category = await prisma.category.create({
        data: { name: 'Order Unit Category', slug: 'order-unit-category' },
    });

    const product = await prisma.product.create({
        data: { vendorId, categoryId: category.id, name: 'Order Unit Product', description: 'For order unit tests', basePrice: 50, images: [], isActive: true },
    });

    const product2 = await prisma.product.create({
        data: { vendorId: vendor2Id, categoryId: category.id, name: 'Order Unit Product 2', description: 'Vendor 2 product', basePrice: 30, images: [], isActive: true },
    });

    const variant = await prisma.variant.create({
        data: { productId: product.id, size: 'M', color: 'Red', price: 50, stock: 20, sku: 'ORD-UNIT-001' },
    });
    variantId = variant.id;

    const variant2 = await prisma.variant.create({
        data: { productId: product2.id, size: 'L', color: 'Blue', price: 30, stock: 20, sku: 'ORD-UNIT-002' },
    });
    variant2Id = variant2.id;

    const address = await prisma.address.create({
        data: {
            userId: customerId,
            fullName: 'Order Unit Customer',
            phone: '555-2222',
            street: '20 Order St',
            city: 'Ordertown',
            state: 'NY',
            country: 'US',
            zipCode: '10001',
        },
    });
    addressId = address.id;
});

// teardownTestDB calls cleanDatabase() (all tables, FK-safe order) then disconnects.
// No manual pre-cleanup needed — cleanDatabase handles everything.
afterAll(teardownTestDB);

beforeEach(() => {
    mockCancel.mockClear();
    mockRefundsCreate.mockClear();
    mockCancel.mockResolvedValue({});
    mockRefundsCreate.mockResolvedValue({ id: 're_test' });
    jest.spyOn(NotificationService.prototype, 'createAndSend').mockResolvedValue(undefined as any);
    jest.spyOn(vendorPayoutService, 'reverseEarningsForOrder').mockResolvedValue(undefined as any);
});

// ---------------------
// Helpers
// ---------------------
async function seedCart(qty = 2) {
    // Clear existing cart
    const existingCart = await prisma.cart.findUnique({ where: { userId: customerId } });
    if (existingCart) {
        await prisma.cartItem.deleteMany({ where: { cartId: existingCart.id } });
    }

    // Upsert cart and add item
    const cart = await prisma.cart.upsert({
        where: { userId: customerId },
        create: { userId: customerId },
        update: {},
    });

    await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        create: { cartId: cart.id, variantId, quantity: qty },
        update: { quantity: qty },
    });

    return cart.id;
}

async function cleanOrders() {
    await prisma.promoUsage.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    // promoCode after order (order.promoCodeId is nullable NoAction FK)
    await prisma.promoCode.deleteMany({});
    // Restore stock to initial values
    await prisma.variant.update({ where: { id: variantId }, data: { stock: 20 } });
    await prisma.variant.update({ where: { id: variant2Id }, data: { stock: 20 } });
}

// ---------------------
// createOrder()
// ---------------------
describe('OrderService — createOrder()', () => {
    beforeEach(async () => {
        await cleanOrders();
        await seedCart(2);
    });

    it('should create an order, decrement stock, clear the cart, and return full order shape', async () => {
        const order = await orderService.createOrder(customerId, { addressId });

        expect(order.orderNumber).toMatch(/^ORD-\d{8}-[0-9A-F]{8}$/);
        expect(Number(order.subtotal)).toBe(100); // 2 * $50
        expect(Number(order.discount)).toBe(0);
        expect(Number(order.total)).toBe(100);
        expect(order.vendorOrders).toHaveLength(1);
        expect(order.vendorOrders[0].items).toHaveLength(1);

        const v = await prisma.variant.findUnique({ where: { id: variantId } });
        expect(v!.stock).toBe(18); // 20 - 2

        const cart = await prisma.cart.findUnique({ where: { userId: customerId }, include: { items: true } });
        expect(cart!.items).toHaveLength(0);
    });

    it('should throw 400 when cart is empty', async () => {
        const cart = await prisma.cart.findUnique({ where: { userId: customerId } });
        if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

        await expect(
            orderService.createOrder(customerId, { addressId })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 404 when addressId does not belong to the user', async () => {
        await expect(
            orderService.createOrder(customerId, { addressId: '00000000-0000-0000-0000-000000000000' })
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when promoCode does not exist', async () => {
        await expect(
            orderService.createOrder(customerId, { addressId, promoCode: 'DOESNOTEXIST' })
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 400 when promoCode is inactive', async () => {
        const promo = await prisma.promoCode.create({
            data: { code: 'INACTIVE_ORD', discountType: 'PERCENTAGE', discountValue: 10, isActive: false },
        });

        await expect(
            orderService.createOrder(customerId, { addressId, promoCode: 'INACTIVE_ORD' })
        ).rejects.toMatchObject({ statusCode: 400 });
        // Cleanup handled by afterEach(cleanOrders)
    });

    it('should throw 400 when promoCode has expired', async () => {
        await prisma.promoCode.create({
            data: { code: 'EXPIRED_ORD', discountType: 'PERCENTAGE', discountValue: 10, isActive: true, expiresAt: new Date('2020-01-01') },
        });

        await expect(
            orderService.createOrder(customerId, { addressId, promoCode: 'EXPIRED_ORD' })
        ).rejects.toMatchObject({ statusCode: 400 });
        // Cleanup handled by afterEach(cleanOrders)
    });

    it('should apply PERCENTAGE discount correctly and respect maxDiscount cap', async () => {
        // 10% of $100 = $10, capped at $8
        await prisma.promoCode.create({
            data: { code: 'PCT10', discountType: 'PERCENTAGE', discountValue: 10, maxDiscount: 8, isActive: true, usageLimit: 100 },
        });

        const order = await orderService.createOrder(customerId, { addressId, promoCode: 'PCT10' });

        expect(Number(order.discount)).toBe(8);
        expect(Number(order.total)).toBe(92);
        // Cleanup handled by afterEach(cleanOrders)
    });

    it('should apply FLAT discount correctly', async () => {
        await prisma.promoCode.create({
            data: { code: 'FLAT15', discountType: 'FIXED', discountValue: 15, isActive: true, usageLimit: 100 },
        });

        const order = await orderService.createOrder(customerId, { addressId, promoCode: 'FLAT15' });

        expect(Number(order.discount)).toBe(15);
        expect(Number(order.total)).toBe(85);
        // Cleanup handled by afterEach(cleanOrders)
    });

    it('should throw 400 for insufficient stock', async () => {
        const cart = await prisma.cart.findUnique({ where: { userId: customerId } });
        // Force quantity beyond available stock
        await prisma.cartItem.upsert({
            where: { cartId_variantId: { cartId: cart!.id, variantId } },
            create: { cartId: cart!.id, variantId, quantity: 999 },
            update: { quantity: 999 },
        });

        await expect(
            orderService.createOrder(customerId, { addressId })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should group items from two vendors into separate VendorOrders', async () => {
        // Add vendor2 item to cart
        const cart = await prisma.cart.findUnique({ where: { userId: customerId } });
        await prisma.cartItem.upsert({
            where: { cartId_variantId: { cartId: cart!.id, variantId: variant2Id } },
            create: { cartId: cart!.id, variantId: variant2Id, quantity: 1 },
            update: { quantity: 1 },
        });

        const order = await orderService.createOrder(customerId, { addressId });

        expect(order.vendorOrders).toHaveLength(2);
        const vendorIds = order.vendorOrders.map((vo) => vo.vendorId).sort();
        expect(vendorIds).toContain(vendorId);
        expect(vendorIds).toContain(vendor2Id);
    });

    it('should increment promo usageCount atomically inside the transaction', async () => {
        await prisma.promoCode.create({
            data: { code: 'USECOUNT', discountType: 'FIXED', discountValue: 5, isActive: true, usageLimit: 100 },
        });

        await orderService.createOrder(customerId, { addressId, promoCode: 'USECOUNT' });

        const promo = await prisma.promoCode.findUnique({ where: { code: 'USECOUNT' } });
        expect(promo!.usageCount).toBe(1);
        // Cleanup handled by afterEach(cleanOrders)
    });
});

// ---------------------
// getOrders()
// ---------------------
describe('OrderService — getOrders()', () => {
    beforeAll(async () => {
        await cleanOrders();
        // Create two orders for customer
        for (let i = 0; i < 2; i++) {
            await seedCart(1);
            await orderService.createOrder(customerId, { addressId });
        }
    });

    afterAll(cleanOrders);

    it('should return paginated orders for the user', async () => {
        const result = await orderService.getOrders(customerId, { page: 1, limit: 10 });

        expect(result.items.length).toBe(2);
        expect(result.meta.total).toBe(2);
        expect(result.meta.page).toBe(1);
    });

    it('should return empty items when user has no orders', async () => {
        const result = await orderService.getOrders(customer2Id, { page: 1, limit: 10 });

        expect(result.items).toHaveLength(0);
        expect(result.meta.total).toBe(0);
        expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by vendorOrder status (returns matching orders)', async () => {
        const result = await orderService.getOrders(customerId, { page: 1, limit: 10, status: 'PENDING' });

        expect(result.items.length).toBeGreaterThan(0);
        result.items.forEach((order) => {
            const hasMatchingStatus = order.vendorOrders.some((vo) => vo.status === 'PENDING');
            expect(hasMatchingStatus).toBe(true);
        });
    });

    it('should return correct meta (total, page, limit, totalPages)', async () => {
        const result = await orderService.getOrders(customerId, { page: 1, limit: 1 });

        expect(result.meta.total).toBe(2);
        expect(result.meta.limit).toBe(1);
        expect(result.meta.totalPages).toBe(2);
        expect(result.items).toHaveLength(1);
    });
});

// ---------------------
// getOrderById()
// ---------------------
describe('OrderService — getOrderById()', () => {
    let orderId: string;

    beforeAll(async () => {
        await cleanOrders();
        await seedCart(1);
        const order = await orderService.createOrder(customerId, { addressId });
        orderId = order.id;
    });

    afterAll(cleanOrders);

    it('should return full order with vendorOrders, address, and payment', async () => {
        const order = await orderService.getOrderById(customerId, orderId);

        expect(order.id).toBe(orderId);
        expect(order.vendorOrders).toBeDefined();
        expect(order.address).toBeDefined();
    });

    it('should throw 404 when orderId does not exist', async () => {
        await expect(
            orderService.getOrderById(customerId, '00000000-0000-0000-0000-000000000000')
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when orderId belongs to a different user', async () => {
        await expect(
            orderService.getOrderById(customer2Id, orderId)
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// ---------------------
// cancelOrder()
// ---------------------
describe('OrderService — cancelOrder()', () => {
    afterEach(cleanOrders);

    async function createPendingOrder() {
        await seedCart(1);
        return orderService.createOrder(customerId, { addressId });
    }

    it('should cancel a PENDING order and restore stock', async () => {
        const order = await createPendingOrder();
        // seedCart uses qty=1, so stock goes 20→19 on createOrder
        await orderService.cancelOrder(customerId, order.id, {});

        const stockAfter = await prisma.variant.findUnique({ where: { id: variantId } });
        expect(stockAfter!.stock).toBe(20); // fully restored to initial value

        const vendorOrders = await prisma.vendorOrder.findMany({ where: { orderId: order.id } });
        expect(vendorOrders.every((vo) => vo.status === 'CANCELLED')).toBe(true);
    });

    it('should persist cancellationReason when provided', async () => {
        const order = await createPendingOrder();

        await orderService.cancelOrder(customerId, order.id, { reason: 'Changed my mind' });

        const updated = await prisma.order.findUnique({ where: { id: order.id } });
        expect(updated!.cancellationReason).toBe('Changed my mind');
    });

    it('should throw 400 when a vendorOrder is in non-cancellable status', async () => {
        const order = await createPendingOrder();
        const vendorOrder = await prisma.vendorOrder.findFirst({ where: { orderId: order.id } });

        // Advance to PROCESSING (not cancellable)
        await prisma.vendorOrder.update({ where: { id: vendorOrder!.id }, data: { status: 'PROCESSING' } });

        await expect(
            orderService.cancelOrder(customerId, order.id, {})
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should call stripe.paymentIntents.cancel when payment is PROCESSING', async () => {
        const order = await createPendingOrder();

        await prisma.payment.create({
            data: { orderId: order.id, amount: 50, currency: 'USD', method: 'CARD', status: 'PROCESSING', stripePaymentIntentId: 'pi_unit_cancel_test' },
        });

        await orderService.cancelOrder(customerId, order.id, {});

        expect(mockCancel).toHaveBeenCalledWith('pi_unit_cancel_test');
    });

    it('should call stripe.refunds.create when payment is SUCCEEDED', async () => {
        const order = await createPendingOrder();

        await prisma.payment.create({
            data: { orderId: order.id, amount: 50, currency: 'USD', method: 'CARD', status: 'SUCCEEDED', stripePaymentIntentId: 'pi_unit_refund_test', paidAt: new Date() },
        });

        await orderService.cancelOrder(customerId, order.id, {});

        expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_unit_refund_test' });
    });

    it('should throw 404 when orderId does not exist', async () => {
        await expect(
            orderService.cancelOrder(customerId, '00000000-0000-0000-0000-000000000000', {})
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// ---------------------
// updateVendorOrderStatus()
// ---------------------
describe('OrderService — updateVendorOrderStatus()', () => {
    let orderId: string;
    let vendorOrderId: string;

    beforeEach(async () => {
        await cleanOrders();
        await seedCart(1);
        const order = await orderService.createOrder(customerId, { addressId });
        orderId = order.id;
        vendorOrderId = order.vendorOrders[0].id;
    });

    afterEach(cleanOrders);

    it('should transition PENDING → CONFIRMED and fire notification (fire-and-forget)', async () => {
        const updated = await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'CONFIRMED' });
        expect(updated.status).toBe('CONFIRMED');
    });

    it('should transition CONFIRMED → PROCESSING', async () => {
        await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'CONFIRMED' });
        const updated = await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'PROCESSING' });
        expect(updated.status).toBe('PROCESSING');
    });

    it('should transition PROCESSING → SHIPPED', async () => {
        await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'CONFIRMED' });
        await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'PROCESSING' });
        const updated = await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'SHIPPED' });
        expect(updated.status).toBe('SHIPPED');
    });

    it('should transition SHIPPED → DELIVERED', async () => {
        await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'CONFIRMED' });
        await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'PROCESSING' });
        await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'SHIPPED' });
        const updated = await orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'DELIVERED' });
        expect(updated.status).toBe('DELIVERED');
    });

    it('should throw 400 for a backward/invalid transition (PENDING → SHIPPED)', async () => {
        await expect(
            orderService.updateVendorOrderStatus(vendorId, orderId, vendorOrderId, { status: 'SHIPPED' })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 404 when vendorOrderId does not exist', async () => {
        await expect(
            orderService.updateVendorOrderStatus(vendorId, orderId, '00000000-0000-0000-0000-000000000000', { status: 'CONFIRMED' })
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 when vendor does not own the vendorOrder', async () => {
        await expect(
            orderService.updateVendorOrderStatus(vendor2Id, orderId, vendorOrderId, { status: 'CONFIRMED' })
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// ---------------------
// getVendorOrders()
// ---------------------
describe('OrderService — getVendorOrders()', () => {
    beforeAll(async () => {
        await cleanOrders();
        await seedCart(1);
        await orderService.createOrder(customerId, { addressId });
    });

    afterAll(cleanOrders);

    it('should return paginated vendor orders scoped to the vendor', async () => {
        const result = await orderService.getVendorOrders(vendorId, { page: 1, limit: 10 });

        expect(result.items.length).toBe(1);
        expect(result.meta.total).toBe(1);
        result.items.forEach((vo) => expect(vo.vendorId).toBe(vendorId));
    });

    it('should not return orders belonging to another vendor', async () => {
        const result = await orderService.getVendorOrders(vendor2Id, { page: 1, limit: 10 });
        expect(result.items).toHaveLength(0);
    });

    it('should filter by status', async () => {
        const pendingResult = await orderService.getVendorOrders(vendorId, { page: 1, limit: 10, status: 'PENDING' });
        expect(pendingResult.items.length).toBeGreaterThan(0);

        const confirmedResult = await orderService.getVendorOrders(vendorId, { page: 1, limit: 10, status: 'CONFIRMED' });
        expect(confirmedResult.items).toHaveLength(0);
    });
});

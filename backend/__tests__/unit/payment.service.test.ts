import { prisma } from '@config/prisma';
import bcrypt from 'bcrypt';
import { setupTestDB, teardownTestDB } from '../../src/__tests__/setup';
import { vendorPayoutService } from '../../src/modules/vendor-payout/vendor-payout.service';

// ---------------------
// Stripe mock (var-hoisted pattern)
// ---------------------
// eslint-disable-next-line no-var
var mockCreate: jest.Mock;
// eslint-disable-next-line no-var
var mockRetrieve: jest.Mock;
// eslint-disable-next-line no-var
var mockConstructEvent: jest.Mock;
// eslint-disable-next-line no-var
var mockRefundsCreate: jest.Mock;

const MOCK_CLIENT_SECRET = 'pi_unit_test_secret';
const MOCK_INTENT_ID = 'pi_unit_test_intent';

jest.mock('stripe', () => {
    const create = jest.fn();
    const retrieve = jest.fn();
    const constructEvent = jest.fn();
    const refundsCreate = jest.fn();

    mockCreate = create;
    mockRetrieve = retrieve;
    mockConstructEvent = constructEvent;
    mockRefundsCreate = refundsCreate;

    return jest.fn().mockImplementation(() => ({
        paymentIntents: { create, retrieve },
        webhooks: { constructEvent },
        refunds: { create: refundsCreate },
    }));
});

// Import after mock is set up
import { paymentService } from '@modules/payment/payment.service';

// ---------------------
// Test state
// ---------------------
let customerId: string;
let vendorId: string;
let addressId: string;
let variantId: string;

beforeAll(async () => {
    await setupTestDB();

    // Clear in FK-safe order
    await prisma.vendorEarning.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.address.deleteMany({});

    const password = await bcrypt.hash('test1234', 10);

    const vendor = await prisma.user.upsert({
        where: { email: 'vendor.payment.unit@ecommerce.com' },
        update: { password },
        create: { name: 'Payment Unit Vendor', email: 'vendor.payment.unit@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });
    vendorId = vendor.id;

    const customer = await prisma.user.upsert({
        where: { email: 'customer.payment.unit@ecommerce.com' },
        update: { password },
        create: { name: 'Payment Unit Customer', email: 'customer.payment.unit@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });
    customerId = customer.id;

    const category = await prisma.category.create({
        data: { name: 'Payment Unit Category', slug: 'payment-unit-category' },
    });

    const product = await prisma.product.create({
        data: {
            vendorId,
            categoryId: category.id,
            name: 'Payment Unit Product',
            description: 'For payment unit tests',
            basePrice: 100,
            images: [],
            isActive: true,
        },
    });

    const variant = await prisma.variant.create({
        data: { productId: product.id, size: 'M', color: 'Green', price: 100, stock: 10, sku: 'PAY-UNIT-001' },
    });
    variantId = variant.id;

    const address = await prisma.address.create({
        data: {
            userId: customerId,
            fullName: 'Payment Unit Customer',
            phone: '555-1111',
            street: '10 Unit St',
            city: 'Testville',
            state: 'TX',
            country: 'US',
            zipCode: '75001',
        },
    });
    addressId = address.id;
});

// teardownTestDB calls cleanDatabase() (all tables, FK-safe order) then disconnects.
// No manual pre-cleanup needed — cleanDatabase handles everything.
afterAll(teardownTestDB);

beforeEach(() => {
    mockCreate.mockClear();
    mockRetrieve.mockClear();
    mockConstructEvent.mockClear();
    mockRefundsCreate.mockClear();
    mockCreate.mockResolvedValue({ id: MOCK_INTENT_ID, client_secret: MOCK_CLIENT_SECRET });
    mockRetrieve.mockResolvedValue({ id: MOCK_INTENT_ID, client_secret: MOCK_CLIENT_SECRET, status: 'requires_payment_method' });
});

// ---------------------
// Helper: create a fresh order + optional vendorOrder
// ---------------------
async function createTestOrder(total = 100): Promise<string> {
    const order = await prisma.order.create({
        data: {
            orderNumber: `ORD-TEST-${Date.now()}`,
            userId: customerId,
            addressId,
            shippingAddress: { fullName: 'Test', phone: '555-1111', street: '10 Unit St', city: 'Testville', state: 'TX', country: 'US', zipCode: '75001' },
            subtotal: total,
            discount: 0,
            tax: 0,
            total,
        },
    });

    await prisma.vendorOrder.create({
        data: { orderId: order.id, vendorId, subtotal: total },
    });

    return order.id;
}

async function cleanOrders() {
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.order.deleteMany({});
}

describe('PaymentService — createPaymentIntent()', () => {
    afterEach(cleanOrders);

    it('should call stripe.paymentIntents.create with correct amount in cents', async () => {
        const orderId = await createTestOrder(100);

        await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 10000, currency: 'usd' })
        );
    });

    it('should create a Payment record in PROCESSING state', async () => {
        const orderId = await createTestOrder(50);

        const result = await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });

        expect(result.clientSecret).toBe(MOCK_CLIENT_SECRET);
        const payment = await prisma.payment.findUnique({ where: { orderId } });
        expect(payment).not.toBeNull();
        expect(payment!.status).toBe('PROCESSING');
        expect(payment!.stripePaymentIntentId).toBe(MOCK_INTENT_ID);
    });

    it('should throw 404 when orderId does not exist', async () => {
        await expect(
            paymentService.createPaymentIntent(customerId, { orderId: '00000000-0000-0000-0000-000000000000', currency: 'USD' })
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 when userId does not match order.userId', async () => {
        const orderId = await createTestOrder();

        await expect(
            paymentService.createPaymentIntent('00000000-0000-0000-0000-000000000000', { orderId, currency: 'USD' })
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should return existing clientSecret without calling stripe.create when intent is reusable', async () => {
        const orderId = await createTestOrder();

        // First call creates payment
        await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });
        mockCreate.mockClear();

        // Second call should reuse existing intent
        const result = await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });

        expect(result.clientSecret).toBe(MOCK_CLIENT_SECRET);
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockRetrieve).toHaveBeenCalledWith(MOCK_INTENT_ID);
    });

    it('should create a fresh intent when existing intent was cancelled on Stripe side', async () => {
        const orderId = await createTestOrder();

        // First call creates payment
        await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });
        mockCreate.mockClear();

        // Stripe reports intent as cancelled
        mockRetrieve.mockResolvedValueOnce({ id: MOCK_INTENT_ID, client_secret: 'old_secret', status: 'canceled' });
        mockCreate.mockResolvedValueOnce({ id: 'pi_new', client_secret: 'new_secret' });

        const result = await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });

        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(result.clientSecret).toBe('new_secret');
    });

    it('should throw 409 when payment is already SUCCEEDED', async () => {
        const orderId = await createTestOrder();
        await prisma.payment.create({
            data: { orderId, amount: 100, currency: 'USD', method: 'CARD', status: 'SUCCEEDED', stripePaymentIntentId: MOCK_INTENT_ID },
        });

        await expect(
            paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' })
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should throw 409 when payment is already FAILED', async () => {
        const orderId = await createTestOrder();
        await prisma.payment.create({
            data: { orderId, amount: 100, currency: 'USD', method: 'CARD', status: 'FAILED', stripePaymentIntentId: MOCK_INTENT_ID },
        });

        await expect(
            paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' })
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should convert Decimal total to integer cents correctly (floating-point safe)', async () => {
        const orderId = await createTestOrder(99.99);

        await paymentService.createPaymentIntent(customerId, { orderId, currency: 'USD' });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 9999 })
        );
    });
});

describe('PaymentService — handleWebhook()', () => {
    afterEach(cleanOrders);

    it('should throw 400 when stripe.webhooks.constructEvent throws (invalid signature)', async () => {
        mockConstructEvent.mockImplementationOnce(() => {
            throw new Error('Webhook signature verification failed');
        });

        await expect(
            paymentService.handleWebhook(Buffer.from('{}'), 'bad-sig')
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should update Payment to SUCCEEDED and VendorOrders to CONFIRMED on payment_intent.succeeded', async () => {
        const orderId = await createTestOrder();
        await prisma.payment.create({
            data: { orderId, amount: 100, currency: 'USD', method: 'CARD', status: 'PROCESSING', stripePaymentIntentId: MOCK_INTENT_ID },
        });

        jest.spyOn(vendorPayoutService, 'createTransfersForPayment').mockResolvedValueOnce(undefined as any);

        mockConstructEvent.mockReturnValueOnce({
            type: 'payment_intent.succeeded',
            data: { object: { id: MOCK_INTENT_ID, payment_method: 'pm_test_unit' } },
        });

        await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');

        const payment = await prisma.payment.findUnique({ where: { orderId } });
        expect(payment!.status).toBe('SUCCEEDED');
        expect(payment!.paidAt).not.toBeNull();
        expect(payment!.stripePaymentMethodId).toBe('pm_test_unit');

        const vendorOrders = await prisma.vendorOrder.findMany({ where: { orderId } });
        expect(vendorOrders.every((vo) => vo.status === 'CONFIRMED')).toBe(true);
    });

    it('should update Payment to FAILED on payment_intent.payment_failed', async () => {
        const orderId = await createTestOrder();
        await prisma.payment.create({
            data: { orderId, amount: 100, currency: 'USD', method: 'CARD', status: 'PROCESSING', stripePaymentIntentId: MOCK_INTENT_ID },
        });

        mockConstructEvent.mockReturnValueOnce({
            type: 'payment_intent.payment_failed',
            data: { object: { id: MOCK_INTENT_ID } },
        });

        await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');

        const payment = await prisma.payment.findUnique({ where: { orderId } });
        expect(payment!.status).toBe('FAILED');
    });

    it('should not throw for unknown event types', async () => {
        mockConstructEvent.mockReturnValueOnce({
            type: 'customer.subscription.created',
            data: { object: {} },
        });

        await expect(paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig')).resolves.toBeUndefined();
    });
});

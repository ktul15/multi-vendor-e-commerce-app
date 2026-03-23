import request from 'supertest';
import { prisma } from '../../src/config/prisma';
import bcrypt from 'bcrypt';
import app from '../../src/app';

// ---------------------
// Stripe mock
//
// jest.mock is hoisted above all declarations, so the factory runs before
// `const`/`let` variables are initialised (TDZ). `var` is hoisted with
// `undefined` and Jest whitelists `mock*` names in factory closures.
// We assign inside the factory itself so the references are stable by the
// time the service module calls `new Stripe(...)` during import.
// ---------------------
// eslint-disable-next-line no-var
var mockCreate: jest.Mock;
// eslint-disable-next-line no-var
var mockRetrieve: jest.Mock;
// eslint-disable-next-line no-var
var mockConstructEvent: jest.Mock;

const MOCK_CLIENT_SECRET = 'pi_test_XXXXXXXX_secret_YYYYYYYY';
const MOCK_INTENT_ID = 'pi_test_XXXXXXXX';

jest.mock('stripe', () => {
    const create = jest.fn();
    const retrieve = jest.fn();
    const constructEvent = jest.fn();

    // Assign to outer vars so test bodies can configure and inspect them
    mockCreate = create;
    mockRetrieve = retrieve;
    mockConstructEvent = constructEvent;

    return jest.fn().mockImplementation(() => ({
        paymentIntents: { create, retrieve },
        webhooks: { constructEvent },
    }));
});

// ---------------------
// Test state
// ---------------------
let customerToken: string;
let orderId: string;

// ---------------------
// Setup
// ---------------------
beforeAll(async () => {
    // Clear in FK-safe order
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.address.deleteMany({});

    const password = await bcrypt.hash('test1234', 10);

    const vendor = await prisma.user.upsert({
        where: { email: 'vendor.payment@ecommerce.com' },
        update: { password, role: 'VENDOR' },
        create: { name: 'Payment Vendor', email: 'vendor.payment@ecommerce.com', password, role: 'VENDOR', isVerified: true },
    });

    const customer = await prisma.user.upsert({
        where: { email: 'customer.payment@ecommerce.com' },
        update: { password, role: 'CUSTOMER' },
        create: { name: 'Payment Customer', email: 'customer.payment@ecommerce.com', password, role: 'CUSTOMER', isVerified: true },
    });

    const category = await prisma.category.create({
        data: { name: 'Payment Test Category', slug: 'payment-test-category' },
    });

    const product = await prisma.product.create({
        data: {
            vendorId: vendor.id,
            categoryId: category.id,
            name: 'Payment Test Product',
            description: 'A product for payment tests',
            basePrice: 100,
            images: [],
            isActive: true,
        },
    });

    const variant = await prisma.variant.create({
        data: { productId: product.id, size: 'M', color: 'Blue', price: 100, stock: 10, sku: 'PAY-SKU-001' },
    });

    const address = await prisma.address.create({
        data: {
            userId: customer.id,
            fullName: 'Payment Customer',
            phone: '555-9999',
            street: '1 Pay Street',
            city: 'Paytown',
            state: 'CA',
            country: 'US',
            zipCode: '90210',
        },
    });

    // Build order directly in DB to isolate payment tests from the order API
    const order = await prisma.order.create({
        data: {
            orderNumber: 'ORD-TEST-PAY-0001',
            userId: customer.id,
            addressId: address.id,
            shippingAddress: {
                fullName: 'Payment Customer',
                phone: '555-9999',
                street: '1 Pay Street',
                city: 'Paytown',
                state: 'CA',
                country: 'US',
                zipCode: '90210',
            },
            subtotal: 100,
            discount: 0,
            tax: 0,
            total: 100,
        },
    });
    orderId = order.id;

    const vendorOrder = await prisma.vendorOrder.create({
        data: { orderId: order.id, vendorId: vendor.id, subtotal: 100 },
    });

    await prisma.orderItem.create({
        data: {
            vendorOrderId: vendorOrder.id,
            variantId: variant.id,
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
        },
    });

    // Login
    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer.payment@ecommerce.com', password: 'test1234' });
    customerToken = `Bearer ${loginRes.body.data.tokens.accessToken}`;
});

afterAll(async () => {
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.vendorOrder.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.$disconnect();
});

beforeEach(() => {
    mockCreate.mockClear();
    mockRetrieve.mockClear();
    mockConstructEvent.mockClear();
    mockCreate.mockResolvedValue({ id: MOCK_INTENT_ID, client_secret: MOCK_CLIENT_SECRET });
    mockRetrieve.mockResolvedValue({
        id: MOCK_INTENT_ID,
        client_secret: MOCK_CLIENT_SECRET,
        status: 'requires_payment_method', // reusable state — intent is still completable
    });
});

// ---------------------
// Tests
// ---------------------
describe('Payment API (Issue #32)', () => {

    describe('POST /api/v1/payments/create-intent', () => {

        it('should return 401 without auth', async () => {
            const res = await request(app)
                .post('/api/v1/payments/create-intent')
                .send({ orderId });
            expect(res.status).toBe(401);
        });

        it('should return 400 for invalid orderId (not a UUID)', async () => {
            const res = await request(app)
                .post('/api/v1/payments/create-intent')
                .set('Authorization', customerToken)
                .send({ orderId: 'not-a-uuid' });
            expect(res.status).toBe(400);
        });

        it('should return 404 for a non-existent orderId', async () => {
            const res = await request(app)
                .post('/api/v1/payments/create-intent')
                .set('Authorization', customerToken)
                .send({ orderId: '00000000-0000-0000-0000-000000000000' });
            expect(res.status).toBe(404);
        });

        it('should create a payment intent and return clientSecret (happy path)', async () => {
            const res = await request(app)
                .post('/api/v1/payments/create-intent')
                .set('Authorization', customerToken)
                .send({ orderId, currency: 'USD' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.clientSecret).toBe(MOCK_CLIENT_SECRET);
            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({ amount: 10000, currency: 'usd' }),
            );

            const payment = await prisma.payment.findUnique({ where: { orderId } });
            expect(payment).not.toBeNull();
            expect(payment!.status).toBe('PROCESSING');
            expect(payment!.stripePaymentIntentId).toBe(MOCK_INTENT_ID);
        });

        it('should return existing clientSecret on a second call (idempotency)', async () => {
            const res = await request(app)
                .post('/api/v1/payments/create-intent')
                .set('Authorization', customerToken)
                .send({ orderId, currency: 'USD' });

            expect(res.status).toBe(201);
            expect(res.body.data.clientSecret).toBe(MOCK_CLIENT_SECRET);
            // Should retrieve existing intent, NOT create a new one
            expect(mockCreate).not.toHaveBeenCalled();
            expect(mockRetrieve).toHaveBeenCalledWith(MOCK_INTENT_ID);
        });
    });

    describe('POST /api/v1/payments/webhook', () => {

        it('should return 400 when Stripe-Signature header is missing', async () => {
            const res = await request(app)
                .post('/api/v1/payments/webhook')
                .type('json')
                .send('{}');
            expect(res.status).toBe(400);
        });

        it('should return 400 when signature verification fails', async () => {
            mockConstructEvent.mockImplementationOnce(() => {
                throw new Error('Webhook signature verification failed');
            });

            const res = await request(app)
                .post('/api/v1/payments/webhook')
                .type('json')
                .set('stripe-signature', 'invalid-sig')
                .send('{}');
            expect(res.status).toBe(400);
        });

        it('should handle payment_intent.succeeded and mark payment SUCCEEDED', async () => {
            mockConstructEvent.mockReturnValueOnce({
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: MOCK_INTENT_ID,
                        payment_method: 'pm_test_XXXXXX',
                    },
                },
            });

            const res = await request(app)
                .post('/api/v1/payments/webhook')
                .type('json')
                .set('stripe-signature', 'valid-sig-mocked')
                .send('{}');

            expect(res.status).toBe(200);
            expect(res.body.received).toBe(true);

            const payment = await prisma.payment.findUnique({ where: { orderId } });
            expect(payment!.status).toBe('SUCCEEDED');
            expect(payment!.paidAt).not.toBeNull();
            expect(payment!.stripePaymentMethodId).toBe('pm_test_XXXXXX');

            // VendorOrders should be atomically confirmed
            const vendorOrders = await prisma.vendorOrder.findMany({ where: { orderId } });
            expect(vendorOrders.every((vo) => vo.status === 'CONFIRMED')).toBe(true);
        });

        it('should handle payment_intent.payment_failed and mark payment FAILED', async () => {
            // Reset to PROCESSING first so the failed event can be applied
            await prisma.payment.update({
                where: { orderId },
                data: { status: 'PROCESSING', paidAt: null, stripePaymentMethodId: null },
            });

            mockConstructEvent.mockReturnValueOnce({
                type: 'payment_intent.payment_failed',
                data: {
                    object: { id: MOCK_INTENT_ID },
                },
            });

            const res = await request(app)
                .post('/api/v1/payments/webhook')
                .type('json')
                .set('stripe-signature', 'valid-sig-mocked')
                .send('{}');

            expect(res.status).toBe(200);
            expect(res.body.received).toBe(true);

            const payment = await prisma.payment.findUnique({ where: { orderId } });
            expect(payment!.status).toBe('FAILED');
        });

        it('should return 409 when trying to create intent for a non-PROCESSING payment', async () => {
            // Payment is currently FAILED from the previous test
            const res = await request(app)
                .post('/api/v1/payments/create-intent')
                .set('Authorization', customerToken)
                .send({ orderId, currency: 'USD' });

            expect(res.status).toBe(409);
        });
    });
});

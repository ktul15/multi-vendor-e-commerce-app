import { prisma } from '@config/prisma';
import bcrypt from 'bcrypt';
import { createHmac } from 'crypto';
import { setupTestDB, teardownTestDB } from '../../src/__tests__/setup';
import { NotificationService } from '../../src/modules/notification/notification.service';
import { vendorPayoutService } from '../../src/modules/vendor-payout/vendor-payout.service';

// ---------------------
// Stripe mock (var-hoisted pattern)
// ---------------------
// eslint-disable-next-line no-var
var mockCreate: jest.Mock;
// eslint-disable-next-line no-var
var mockRetrieve: jest.Mock;
// eslint-disable-next-line no-var
var mockUpdate: jest.Mock;
// eslint-disable-next-line no-var
var mockConstructEvent: jest.Mock;
// eslint-disable-next-line no-var
var mockRefundsCreate: jest.Mock;
// eslint-disable-next-line no-var
var mockTransfersCreate: jest.Mock;

const MOCK_CLIENT_SECRET = 'pi_unit_test_secret';
const MOCK_INTENT_ID = 'pi_unit_test_intent';

jest.mock('stripe', () => {
  const create = jest.fn();
  const retrieve = jest.fn();
  const update = jest.fn();
  const constructEvent = jest.fn();
  const refundsCreate = jest.fn();
  const transfersCreate = jest.fn();

  mockCreate = create;
  mockRetrieve = retrieve;
  mockUpdate = update;
  mockConstructEvent = constructEvent;
  mockRefundsCreate = refundsCreate;
  mockTransfersCreate = transfersCreate;

  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create, retrieve, update },
    webhooks: { constructEvent },
    refunds: { create: refundsCreate },
    transfers: { create: transfersCreate, createReversal: jest.fn() },
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
    create: {
      name: 'Payment Unit Vendor',
      email: 'vendor.payment.unit@ecommerce.com',
      password,
      role: 'VENDOR',
      isVerified: true,
    },
  });
  vendorId = vendor.id;
  await prisma.vendorProfile.upsert({
    where: { userId: vendor.id },
    update: {
      paymentProvider: 'STRIPE',
      settlementCountry: 'US',
      providerAccountId: 'acct_test_payment_unit',
      paymentOnboardingStatus: 'COMPLETE',
    },
    create: {
      userId: vendor.id,
      storeName: 'Payment Unit Vendor Store',
      status: 'APPROVED',
      paymentProvider: 'STRIPE',
      settlementCountry: 'US',
      providerAccountId: 'acct_test_payment_unit',
      paymentOnboardingStatus: 'COMPLETE',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer.payment.unit@ecommerce.com' },
    update: { password },
    create: {
      name: 'Payment Unit Customer',
      email: 'customer.payment.unit@ecommerce.com',
      password,
      role: 'CUSTOMER',
      isVerified: true,
    },
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
    data: {
      productId: product.id,
      size: 'M',
      color: 'Green',
      price: 100,
      stock: 10,
      sku: 'PAY-UNIT-001',
    },
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
  mockUpdate.mockClear();
  mockConstructEvent.mockClear();
  mockRefundsCreate.mockClear();
  mockTransfersCreate.mockClear();
  mockCreate.mockResolvedValue({
    id: MOCK_INTENT_ID,
    client_secret: MOCK_CLIENT_SECRET,
  });
  mockRetrieve.mockResolvedValue({
    id: MOCK_INTENT_ID,
    client_secret: MOCK_CLIENT_SECRET,
    status: 'requires_payment_method',
  });
  mockUpdate.mockResolvedValue({
    id: MOCK_INTENT_ID,
    client_secret: MOCK_CLIENT_SECRET,
  });
  mockTransfersCreate.mockResolvedValue({ id: 'tr_unit_idempotent' });
});

// ---------------------
// Helper: create a fresh order + optional vendorOrder
// ---------------------
async function createTestOrder(
  total = 100,
  paymentProvider: 'STRIPE' | 'RAZORPAY' = 'STRIPE'
): Promise<string> {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${Date.now()}`,
      userId: customerId,
      addressId,
      shippingAddress: {
        fullName: 'Test',
        phone: '555-1111',
        street: '10 Unit St',
        city: 'Testville',
        state: 'TX',
        country: 'US',
        zipCode: '75001',
      },
      subtotal: total,
      discount: 0,
      tax: 0,
      total,
      paymentProvider,
    },
  });

  await prisma.vendorOrder.create({
    data: { orderId: order.id, vendorId, subtotal: total },
  });

  return order.id;
}

async function cleanOrders() {
  await prisma.paymentWebhookEvent.deleteMany({});
  await prisma.paymentRefund.deleteMany({});
  await prisma.vendorPayout.deleteMany({});
  await prisma.vendorEarning.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.vendorOrder.deleteMany({});
  await prisma.order.deleteMany({});
}

describe('PaymentService — createPaymentIntent()', () => {
  afterEach(cleanOrders);

  it('should call stripe.paymentIntents.create with correct amount in cents', async () => {
    const orderId = await createTestOrder(100);

    await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10000, currency: 'inr' }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );
  });

  it('rejects Stripe checkout until every vendor has completed onboarding', async () => {
    const orderId = await createTestOrder(100);
    await prisma.vendorProfile.update({
      where: { userId: vendorId },
      data: { paymentOnboardingStatus: 'PENDING' },
    });

    try {
      await expect(
        paymentService.createPaymentIntent(customerId, {
          orderId,
          currency: 'INR',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockCreate).not.toHaveBeenCalled();
    } finally {
      await prisma.vendorProfile.update({
        where: { userId: vendorId },
        data: { paymentOnboardingStatus: 'COMPLETE' },
      });
    }
  });

  it('should create a Payment record in PROCESSING state', async () => {
    const orderId = await createTestOrder(50);

    const result = await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });

    expect(result).toMatchObject({
      provider: 'STRIPE',
      clientSecret: MOCK_CLIENT_SECRET,
    });
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe('PROCESSING');
    expect(payment!.providerPaymentId).toBe(MOCK_INTENT_ID);
  });

  it('serializes concurrent checkout creation with a local lease', async () => {
    const orderId = await createTestOrder(100);
    let releaseProvider!: () => void;
    let markProviderStarted!: () => void;
    const providerStarted = new Promise<void>((resolve) => {
      markProviderStarted = resolve;
    });
    mockCreate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          markProviderStarted();
          releaseProvider = () =>
            resolve({ id: MOCK_INTENT_ID, client_secret: MOCK_CLIENT_SECRET });
        })
    );

    const firstCheckout = paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });
    await providerStarted;
    await expect(
      paymentService.createPaymentIntent(customerId, {
        orderId,
        currency: 'INR',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
    releaseProvider();
    await expect(firstCheckout).resolves.toMatchObject({ provider: 'STRIPE' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should throw 404 when orderId does not exist', async () => {
    await expect(
      paymentService.createPaymentIntent(customerId, {
        orderId: '00000000-0000-0000-0000-000000000000',
        currency: 'INR',
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw 403 when userId does not match order.userId', async () => {
    const orderId = await createTestOrder();

    await expect(
      paymentService.createPaymentIntent(
        '00000000-0000-0000-0000-000000000000',
        { orderId, currency: 'INR' }
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should return existing clientSecret without calling stripe.create when intent is reusable', async () => {
    const orderId = await createTestOrder();

    // First call creates payment
    await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });
    mockCreate.mockClear();

    // Second call should reuse existing intent
    const result = await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });

    expect(result).toMatchObject({
      provider: 'STRIPE',
      clientSecret: MOCK_CLIENT_SECRET,
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockRetrieve).toHaveBeenCalledWith(MOCK_INTENT_ID);
    expect(mockUpdate).toHaveBeenCalledWith(
      MOCK_INTENT_ID,
      expect.objectContaining({
        description: expect.stringContaining('ORD-TEST-'),
      })
    );
  });

  it('should create a fresh intent when existing intent was cancelled on Stripe side', async () => {
    const orderId = await createTestOrder();

    // First call creates payment
    await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });
    mockCreate.mockClear();

    // Stripe reports intent as cancelled
    mockRetrieve.mockResolvedValueOnce({
      id: MOCK_INTENT_ID,
      client_secret: 'old_secret',
      status: 'canceled',
    });
    mockCreate.mockResolvedValueOnce({
      id: 'pi_new',
      client_secret: 'new_secret',
    });

    const result = await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      provider: 'STRIPE',
      clientSecret: 'new_secret',
    });
  });

  it('should throw 409 when payment is already SUCCEEDED', async () => {
    const orderId = await createTestOrder();
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'SUCCEEDED',
        providerPaymentId: MOCK_INTENT_ID,
      },
    });

    await expect(
      paymentService.createPaymentIntent(customerId, {
        orderId,
        currency: 'INR',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('should throw 409 when payment is already FAILED', async () => {
    const orderId = await createTestOrder();
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'FAILED',
        providerPaymentId: MOCK_INTENT_ID,
      },
    });

    await expect(
      paymentService.createPaymentIntent(customerId, {
        orderId,
        currency: 'INR',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('should convert Decimal total to integer cents correctly (floating-point safe)', async () => {
    const orderId = await createTestOrder(99.99);

    await paymentService.createPaymentIntent(customerId, {
      orderId,
      currency: 'INR',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 9999 }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
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
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'PROCESSING',
        providerPaymentId: MOCK_INTENT_ID,
      },
    });

    jest
      .spyOn(vendorPayoutService, 'createTransfersForPayment')
      .mockResolvedValueOnce(undefined as any);

    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_payment_succeeded',
      type: 'payment_intent.succeeded',
      data: { object: { id: MOCK_INTENT_ID, payment_method: 'pm_test_unit' } },
    });

    await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment!.status).toBe('SUCCEEDED');
    expect(payment!.paidAt).not.toBeNull();
    expect(payment!.providerPaymentMethodId).toBe('pm_test_unit');

    const vendorOrders = await prisma.vendorOrder.findMany({
      where: { orderId },
    });
    expect(vendorOrders.every((vo) => vo.status === 'CONFIRMED')).toBe(true);
  });

  it('creates Stripe transfers with a stable earning idempotency key', async () => {
    const orderId = await createTestOrder();
    await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    const earning = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_transfer_idempotency',
      type: 'payment_intent.succeeded',
      data: { object: { id: MOCK_INTENT_ID, payment_method: 'pm_transfer' } },
    });

    await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');

    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ vendorEarningId: earning.id }),
      }),
      { idempotencyKey: `earning_${earning.id}` }
    );
  });

  it('retries a failed Stripe transfer on duplicate webhooks with the same key', async () => {
    const orderId = await createTestOrder();
    await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    const earning = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    mockTransfersCreate
      .mockRejectedValueOnce(new Error('connection closed'))
      .mockResolvedValueOnce({ id: 'tr_retry_same_key' });
    mockConstructEvent.mockReturnValue({
      id: 'evt_transfer_retry',
      type: 'payment_intent.succeeded',
      data: {
        object: { id: MOCK_INTENT_ID, payment_method: 'pm_transfer_retry' },
      },
    });
    const notification = jest
      .spyOn(NotificationService.prototype, 'createAndSend')
      .mockResolvedValue(undefined as any);

    try {
      await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');
      await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');

      expect(mockTransfersCreate).toHaveBeenCalledTimes(2);
      expect(mockTransfersCreate.mock.calls[0][1]).toEqual({
        idempotencyKey: `earning_${earning.id}`,
      });
      expect(mockTransfersCreate.mock.calls[1][1]).toEqual(
        mockTransfersCreate.mock.calls[0][1]
      );
      expect(notification).toHaveBeenCalledTimes(1);
      const retried = await prisma.vendorEarning.findUniqueOrThrow({
        where: { id: earning.id },
      });
      expect(retried.providerTransferId).toBe('tr_retry_same_key');
      expect(retried.status).toBe('TRANSFERRED');
    } finally {
      notification.mockRestore();
    }
  });

  it('reconciles a refund webhook by its stable local receipt', async () => {
    const orderId = await createTestOrder();
    const payment = await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'SUCCEEDED',
        providerPaymentId: MOCK_INTENT_ID,
      },
    });
    const refund = await prisma.paymentRefund.create({
      data: { paymentId: payment.id, provider: 'STRIPE', amount: 40 },
    });
    const reversal = jest
      .spyOn(vendorPayoutService, 'reverseEarningsForOrder')
      .mockResolvedValue(true);
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_refund_before_local_provider_id',
      type: 'refund.updated',
      data: {
        object: {
          id: 're_webhook_first',
          status: 'succeeded',
          metadata: { receipt: refund.id },
        },
      },
    });

    try {
      await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');
      await expect(
        prisma.paymentRefund.findUniqueOrThrow({ where: { id: refund.id } })
      ).resolves.toMatchObject({
        providerRefundId: 're_webhook_first',
        status: 'SUCCEEDED',
      });
    } finally {
      reversal.mockRestore();
    }
  });

  it('returns a retryable error and releases a refund webhook with no local row', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_refund_before_any_local_row',
      type: 'refund.updated',
      data: {
        object: {
          id: 're_not_visible_yet',
          status: 'succeeded',
          metadata: { receipt: '00000000-0000-4000-8000-000000000000' },
        },
      },
    });

    await expect(
      paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig')
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(
      await prisma.paymentWebhookEvent.count({
        where: {
          provider: 'STRIPE',
          eventId: 'evt_refund_before_any_local_row',
        },
      })
    ).toBe(0);
  });

  it('should update Payment to FAILED on payment_intent.payment_failed', async () => {
    const orderId = await createTestOrder();
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'PROCESSING',
        providerPaymentId: MOCK_INTENT_ID,
      },
    });

    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_payment_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: MOCK_INTENT_ID } },
    });

    await paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig');

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment!.status).toBe('FAILED');
  });

  it('should not throw for unknown event types', async () => {
    mockConstructEvent.mockReturnValueOnce({
      id: 'evt_unknown',
      type: 'customer.subscription.created',
      data: { object: {} },
    });

    await expect(
      paymentService.handleWebhook(Buffer.from('{}'), 'valid-sig')
    ).resolves.toBeUndefined();
  });
});

describe('PaymentService — Razorpay sandbox', () => {
  beforeEach(async () => {
    await prisma.vendorProfile.update({
      where: { userId: vendorId },
      data: {
        paymentProvider: 'RAZORPAY',
        settlementCountry: 'IN',
        providerAccountId: 'acc_mock_vendor',
        paymentOnboardingStatus: 'COMPLETE',
      },
    });
  });

  afterEach(async () => {
    await cleanOrders();
    await prisma.vendorProfile.update({
      where: { userId: vendorId },
      data: {
        paymentProvider: 'STRIPE',
        settlementCountry: 'US',
        providerAccountId: null,
        paymentOnboardingStatus: 'NOT_STARTED',
      },
    });
  });

  it('creates deterministic Route splits and verifies checkout signature', async () => {
    const orderId = await createTestOrder(99.99, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });

    expect(checkout).toMatchObject({
      provider: 'RAZORPAY',
      amount: 9999,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');

    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId },
    });
    const earning = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    expect(payment.status).toBe('SUCCEEDED');
    expect(earning.providerTransferId).toMatch(/^trf_mock_/);
    expect(Number(earning.netAmount) + Number(earning.commissionAmount)).toBe(
      Number(earning.grossAmount)
    );
  });

  it('completes a deterministic multi-vendor Indian Route checkout without real money', async () => {
    const secondVendor = await prisma.user.create({
      data: {
        name: 'Second Razorpay Vendor',
        email: `second.razorpay.${Date.now()}@example.com`,
        password: 'sandbox-only',
        role: 'VENDOR',
        isVerified: true,
        vendorProfile: {
          create: {
            storeName: `Second Route Store ${Date.now()}`,
            status: 'APPROVED',
            paymentProvider: 'RAZORPAY',
            settlementCountry: 'IN',
            providerAccountId: `acc_mock_second_${Date.now()}`,
            paymentOnboardingStatus: 'COMPLETE',
            commissionRate: 12.5,
          },
        },
      },
    });
    try {
      const orderId = await createTestOrder(150, 'RAZORPAY');
      await prisma.vendorOrder.updateMany({
        where: { orderId, vendorId },
        data: { subtotal: 100 },
      });
      await prisma.vendorOrder.create({
        data: { orderId, vendorId: secondVendor.id, subtotal: 50 },
      });

      const checkout = await paymentService.createCheckout(customerId, {
        orderId,
        currency: 'INR',
      });
      if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
        throw new Error('Expected Razorpay mock checkout');
      expect(checkout.transfers).toHaveLength(2);

      await paymentService.confirmRazorpayPayment(customerId, {
        orderId,
        providerOrderId: checkout.providerOrderId,
        providerPaymentId: checkout.mockConfirmation.paymentId,
        signature: checkout.mockConfirmation.signature,
      });
      const earnings = await prisma.vendorEarning.findMany({
        where: { orderId },
      });
      expect(earnings).toHaveLength(2);
      expect(
        earnings.reduce((sum, item) => sum + Number(item.grossAmount), 0)
      ).toBe(150);
      expect(
        (await prisma.payment.findUniqueOrThrow({ where: { orderId } })).status
      ).toBe('SUCCEEDED');
    } finally {
      await cleanOrders();
      await prisma.vendorProfile.deleteMany({
        where: { userId: secondVendor.id },
      });
      await prisma.user.delete({ where: { id: secondVendor.id } });
    }
  });

  it('rejects an invalid returned payment signature', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');

    await expect(
      paymentService.confirmRazorpayPayment(customerId, {
        orderId,
        providerOrderId: checkout.providerOrderId,
        providerPaymentId: checkout.mockConfirmation.paymentId,
        signature: 'invalid',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('processes a captured webhook only once', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    const raw = Buffer.from(
      JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: checkout.mockConfirmation.paymentId,
              order_id: checkout.providerOrderId,
            },
          },
        },
      })
    );
    const signature = createHmac('sha256', 'sandbox-mock-webhook-secret')
      .update(raw)
      .digest('hex');

    await paymentService.handleRazorpayWebhook(
      raw,
      signature,
      'evt_rzp_duplicate'
    );
    await paymentService.handleRazorpayWebhook(
      raw,
      signature,
      'evt_rzp_duplicate'
    );

    expect(
      await prisma.paymentWebhookEvent.count({
        where: { eventId: 'evt_rzp_duplicate' },
      })
    ).toBe(1);
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { orderId } })).status
    ).toBe('SUCCEEDED');
  });

  it('reconciles a Razorpay refund webhook by its stable receipt', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId },
    });
    const refund = await prisma.paymentRefund.create({
      data: { paymentId: payment.id, provider: 'RAZORPAY', amount: 40 },
    });
    const raw = Buffer.from(
      JSON.stringify({
        event: 'refund.processed',
        payload: {
          refund: {
            entity: { id: 'rfnd_webhook_first', receipt: refund.id },
          },
        },
      })
    );
    const signature = createHmac('sha256', 'sandbox-mock-webhook-secret')
      .update(raw)
      .digest('hex');

    await paymentService.handleRazorpayWebhook(
      raw,
      signature,
      'evt_rzp_refund_before_local_provider_id'
    );

    await expect(
      prisma.paymentRefund.findUniqueOrThrow({ where: { id: refund.id } })
    ).resolves.toMatchObject({
      providerRefundId: 'rfnd_webhook_first',
      status: 'SUCCEEDED',
    });
  });

  it('does not mark an earning fully reversed for a partial reversal webhook', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY')
      throw new Error('Expected Razorpay mock checkout');
    const raw = Buffer.from(
      JSON.stringify({
        event: 'transfer.reversed',
        payload: {
          transfer: {
            entity: {
              id: checkout.transfers[0].transferId,
              amount_reversed: 1000,
            },
          },
        },
      })
    );
    const signature = createHmac('sha256', 'sandbox-mock-webhook-secret')
      .update(raw)
      .digest('hex');

    await paymentService.handleRazorpayWebhook(
      raw,
      signature,
      'evt_rzp_partial_reversal'
    );

    const earning = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    expect(Number(earning.reversedAmount)).toBe(10);
    expect(earning.status).not.toBe('REVERSED');
  });

  it('serializes concurrent partial-refund reversal webhooks per payment', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId },
    });
    await prisma.paymentRefund.createMany({
      data: [
        {
          paymentId: payment.id,
          provider: 'RAZORPAY',
          providerRefundId: 'rfnd_concurrent_40',
          amount: 40,
        },
        {
          paymentId: payment.id,
          provider: 'RAZORPAY',
          providerRefundId: 'rfnd_concurrent_60',
          amount: 60,
        },
      ],
    });
    const events = ['rfnd_concurrent_40', 'rfnd_concurrent_60'].map(
      (refundId) => {
        const raw = Buffer.from(
          JSON.stringify({
            event: 'refund.processed',
            payload: { refund: { entity: { id: refundId } } },
          })
        );
        return {
          raw,
          signature: createHmac('sha256', 'sandbox-mock-webhook-secret')
            .update(raw)
            .digest('hex'),
        };
      }
    );

    await Promise.all(
      events.map((event, index) =>
        paymentService.handleRazorpayWebhook(
          event.raw,
          event.signature,
          `evt_refund_concurrent_${index}`
        )
      )
    );

    const refunds = await prisma.paymentRefund.findMany({
      where: { paymentId: payment.id },
    });
    expect(
      refunds.every((refund) => refund.reversalStatus === 'SUCCEEDED')
    ).toBe(true);
    const earning = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    expect(Number(earning.reversedAmount)).toBe(Number(earning.netAmount));
    expect(earning.status).toBe('REVERSED');
  });

  it('keeps partial refunds auditable and prevents over-refunding', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });

    await paymentService.refundOrder(orderId, 40, 'partial test refund');
    await expect(paymentService.refundOrder(orderId, 61)).rejects.toMatchObject(
      { statusCode: 400 }
    );
    const refund = await prisma.paymentRefund.findFirstOrThrow({
      where: { payment: { orderId } },
    });
    expect(refund.status).toBe('SUCCEEDED');
    expect(refund.reversalStatus).toBe('SUCCEEDED');
    expect(refund.providerRefundId).toMatch(/^rfnd_mock_/);
  });

  it('uses cumulative targets for repeated partial reversals', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });

    await paymentService.refundOrder(orderId, 33.33);
    const first = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    expect(Number(first.reversedAmount)).toBe(30);

    await paymentService.refundOrder(orderId, 66.67);
    const completed = await prisma.vendorEarning.findFirstOrThrow({
      where: { orderId },
    });
    expect(Number(completed.reversedAmount)).toBe(Number(completed.netAmount));
    expect(completed.status).toBe('REVERSED');
  });

  it('keeps a successful provider refund successful when transfer reversal fails', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });
    const reversal = jest
      .spyOn(vendorPayoutService, 'reverseEarningsForOrder')
      .mockResolvedValueOnce(false);

    try {
      await paymentService.refundOrder(orderId, 40);
      const refund = await prisma.paymentRefund.findFirstOrThrow({
        where: { payment: { orderId } },
      });
      expect(refund.status).toBe('SUCCEEDED');
      expect(refund.reversalStatus).toBe('FAILED');
      expect(refund.reversalFailureReason).toBe(
        'Vendor transfer reversal failed'
      );
    } finally {
      reversal.mockRestore();
    }
  });

  it('reclaims a failed reversal lease without issuing another refund', async () => {
    const orderId = await createTestOrder(100, 'RAZORPAY');
    const checkout = await paymentService.createCheckout(customerId, {
      orderId,
      currency: 'INR',
    });
    if (checkout.provider !== 'RAZORPAY' || !checkout.mockConfirmation)
      throw new Error('Expected Razorpay mock checkout');
    await paymentService.confirmRazorpayPayment(customerId, {
      orderId,
      providerOrderId: checkout.providerOrderId,
      providerPaymentId: checkout.mockConfirmation.paymentId,
      signature: checkout.mockConfirmation.signature,
    });
    const reversal = jest
      .spyOn(vendorPayoutService, 'reverseEarningsForOrder')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    try {
      await paymentService.refundOrder(orderId, 40);
      await expect(
        paymentService.refundOrder(orderId, 40)
      ).resolves.toMatchObject({
        status: 'SUCCEEDED',
        reconciled: true,
      });
      const refund = await prisma.paymentRefund.findFirstOrThrow({
        where: { payment: { orderId } },
      });
      expect(refund.reversalStatus).toBe('SUCCEEDED');
      expect(refund.reversalAttempts).toBe(2);
      expect(
        await prisma.paymentRefund.count({ where: { payment: { orderId } } })
      ).toBe(1);
    } finally {
      reversal.mockRestore();
    }
  });

  it('upserts a settlement payout for the signed linked account', async () => {
    const raw = Buffer.from(
      JSON.stringify({
        account_id: 'acc_mock_vendor',
        event: 'settlement.processed',
        payload: {
          settlement: {
            entity: {
              id: 'setl_mock_vendor',
              amount: 1524,
              status: 'processed',
            },
          },
        },
      })
    );
    const signature = createHmac('sha256', 'sandbox-mock-webhook-secret')
      .update(raw)
      .digest('hex');

    await paymentService.handleRazorpayWebhook(
      raw,
      signature,
      'evt_rzp_settlement'
    );

    const payout = await prisma.vendorPayout.findUniqueOrThrow({
      where: { providerPayoutId: 'setl_mock_vendor' },
    });
    expect(payout).toMatchObject({ provider: 'RAZORPAY', status: 'PAID' });
    expect(Number(payout.amount)).toBe(15.24);
  });
});

describe('PaymentService — refund concurrency and ambiguity', () => {
  afterEach(cleanOrders);

  beforeEach(async () => {
    await prisma.vendorProfile.update({
      where: { userId: vendorId },
      data: {
        paymentProvider: 'STRIPE',
        settlementCountry: 'US',
        providerAccountId: 'acct_test_payment_unit',
        paymentOnboardingStatus: 'COMPLETE',
      },
    });
  });

  it('serializes concurrent refund reservations so they cannot over-refund', async () => {
    const orderId = await createTestOrder(100);
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'SUCCEEDED',
        providerPaymentId: 'pi_concurrent_refund',
      },
    });
    mockRefundsCreate.mockResolvedValue({
      id: 're_concurrent',
      status: 'succeeded',
    });
    const reversal = jest
      .spyOn(vendorPayoutService, 'reverseEarningsForOrder')
      .mockResolvedValue(true);

    try {
      const results = await Promise.allSettled([
        paymentService.refundOrder(orderId, 60),
        paymentService.refundOrder(orderId, 60),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled')
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected')
      ).toHaveLength(1);
      expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
    } finally {
      reversal.mockRestore();
    }
  });

  it('retries an ambiguous provider refund with the same idempotency key', async () => {
    const orderId = await createTestOrder(100);
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'SUCCEEDED',
        providerPaymentId: 'pi_ambiguous_refund',
      },
    });
    mockRefundsCreate
      .mockRejectedValueOnce(new Error('connection closed'))
      .mockResolvedValueOnce({
        id: 're_ambiguous_refund',
        status: 'succeeded',
      });

    await expect(paymentService.refundOrder(orderId)).rejects.toThrow(
      'connection closed'
    );
    const pending = await prisma.paymentRefund.findFirstOrThrow({
      where: { payment: { orderId } },
    });
    await expect(paymentService.refundOrder(orderId)).resolves.toMatchObject({
      status: 'SUCCEEDED',
    });

    const refund = await prisma.paymentRefund.findFirstOrThrow({
      where: { payment: { orderId } },
    });
    expect(refund.id).toBe(pending.id);
    expect(refund.status).toBe('SUCCEEDED');
    expect(
      await prisma.paymentRefund.count({ where: { payment: { orderId } } })
    ).toBe(1);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(2);
    expect(mockRefundsCreate.mock.calls[0][1]).toEqual(
      mockRefundsCreate.mock.calls[1][1]
    );
  });

  it('leases an ambiguous provider refund so concurrent retries call Stripe once', async () => {
    const orderId = await createTestOrder(100);
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'SUCCEEDED',
        providerPaymentId: 'pi_ambiguous_concurrent',
      },
    });
    mockRefundsCreate.mockRejectedValueOnce(new Error('connection closed'));
    await expect(paymentService.refundOrder(orderId)).rejects.toThrow(
      'connection closed'
    );
    mockRefundsCreate.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({ id: 're_ambiguous_concurrent', status: 'succeeded' }),
            25
          )
        )
    );

    const results = await Promise.allSettled([
      paymentService.refundOrder(orderId),
      paymentService.refundOrder(orderId),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected')
    ).toHaveLength(1);
    expect(mockRefundsCreate).toHaveBeenCalledTimes(2);
  });

  it('returns the persisted refund when a webhook wins the provider-result race', async () => {
    const orderId = await createTestOrder(100);
    await prisma.payment.create({
      data: {
        orderId,
        provider: 'STRIPE',
        amount: 100,
        currency: 'INR',
        method: 'CARD',
        status: 'SUCCEEDED',
        providerPaymentId: 'pi_webhook_wins_refund',
      },
    });
    mockRefundsCreate.mockImplementationOnce(async () => {
      const refund = await prisma.paymentRefund.findFirstOrThrow({
        where: { payment: { orderId } },
      });
      await prisma.paymentRefund.update({
        where: { id: refund.id },
        data: {
          providerRefundId: 're_webhook_authoritative',
          status: 'SUCCEEDED',
          providerLeaseToken: null,
          providerLeaseExpiresAt: null,
        },
      });
      return { id: 're_stale_endpoint_result', status: 'pending' };
    });
    const reversal = jest
      .spyOn(vendorPayoutService, 'reverseEarningsForOrder')
      .mockResolvedValue(true);

    try {
      await expect(paymentService.refundOrder(orderId)).resolves.toMatchObject({
        providerRefundId: 're_webhook_authoritative',
        status: 'SUCCEEDED',
      });
    } finally {
      reversal.mockRestore();
    }
  });
});

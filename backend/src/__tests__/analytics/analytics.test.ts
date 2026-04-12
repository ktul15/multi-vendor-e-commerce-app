import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { setupTestDB, teardownTestDB } from '../setup';

// ─── Shared state ────────────────────────────────────────────────────────────
let vendorToken: string;
let customerToken: string;
let unapprovedVendorToken: string;

let vendorId: string;
let vendorProfileId: string;
let vendor2Id: string;

let variantId: string;
let variant2Id: string;

// ─── Helper: clean analytics-related tables in FK-safe order ─────────────────
async function cleanAnalyticsData() {
  await prisma.vendorEarning.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.vendorOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.user.deleteMany();
}

// ─── Helper: create a completed VendorOrder with OrderItem and optionally an earning ─
async function createVendorOrder(opts: {
  vendorId: string;
  customerId: string;
  addressId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  vendorProfileId?: string;
  createdAt?: Date;
}) {
  const {
    vendorId: vId,
    customerId,
    addressId,
    variantId: varId,
    quantity,
    unitPrice,
    status = 'DELIVERED',
    vendorProfileId: vpId,
    createdAt,
  } = opts;

  const total = quantity * unitPrice;

  const orderNumber = `ORD-ANA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customerId,
      addressId,
      shippingAddress: { street: '123 Main St', city: 'Test City' },
      subtotal: total,
      discount: 0,
      tax: 0,
      total,
      ...(createdAt && { createdAt }),
    },
  });

  const vendorOrder = await prisma.vendorOrder.create({
    data: {
      orderId: order.id,
      vendorId: vId,
      status,
      subtotal: total,
      ...(createdAt && { createdAt }),
    },
  });

  await prisma.orderItem.create({
    data: {
      vendorOrderId: vendorOrder.id,
      variantId: varId,
      quantity,
      unitPrice,
      totalPrice: total,
    },
  });

  if (vpId && status !== 'CANCELLED' && status !== 'REFUNDED') {
    const gross = total;
    const commission = gross * 0.1;
    await prisma.vendorEarning.create({
      data: {
        vendorProfileId: vpId,
        vendorOrderId: vendorOrder.id,
        orderId: order.id,
        grossAmount: gross,
        commissionAmount: commission,
        netAmount: gross - commission,
        commissionRate: 10,
        currency: 'USD',
        status: 'TRANSFERRED',
        ...(createdAt && { createdAt }),
      },
    });
  }

  return { order, vendorOrder };
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await setupTestDB();
  await cleanAnalyticsData();

  const password = await bcrypt.hash('test1234', 10);

  // Vendor (approved)
  const vendor = await prisma.user.create({
    data: {
      name: 'Analytics Vendor',
      email: 'vendor.analytics@test.com',
      password,
      role: 'VENDOR',
      isVerified: true,
    },
  });
  vendorId = vendor.id;

  const vendorProfile = await prisma.vendorProfile.create({
    data: {
      userId: vendorId,
      storeName: 'Analytics Store',
      status: 'APPROVED',
      commissionRate: 10,
    },
  });
  vendorProfileId = vendorProfile.id;

  // Vendor 2 (approved, for isolation tests)
  const vendor2 = await prisma.user.create({
    data: {
      name: 'Analytics Vendor 2',
      email: 'vendor2.analytics@test.com',
      password,
      role: 'VENDOR',
      isVerified: true,
    },
  });
  vendor2Id = vendor2.id;

  await prisma.vendorProfile.create({
    data: {
      userId: vendor2Id,
      storeName: 'Another Store',
      status: 'APPROVED',
      commissionRate: 10,
    },
  });

  // Customer
  const customer = await prisma.user.create({
    data: {
      name: 'Analytics Customer',
      email: 'customer.analytics@test.com',
      password,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });

  // Unapproved vendor
  const unapprovedVendor = await prisma.user.create({
    data: {
      name: 'Unapproved Vendor',
      email: 'unapproved.analytics@test.com',
      password,
      role: 'VENDOR',
      isVerified: true,
    },
  });
  await prisma.vendorProfile.create({
    data: {
      userId: unapprovedVendor.id,
      storeName: 'Pending Store',
      status: 'PENDING',
    },
  });

  // Category + Products + Variants for vendor 1
  const category = await prisma.category.create({
    data: { name: 'Analytics Category', slug: 'analytics-category' },
  });

  const product = await prisma.product.create({
    data: {
      vendorId: vendorId,
      categoryId: category.id,
      name: 'Widget A',
      description: 'Test product',
      basePrice: 100,
      images: [],
      isActive: true,
    },
  });

  const variant = await prisma.variant.create({
    data: { productId: product.id, price: 100, stock: 100, sku: 'ANA-SKU-001' },
  });
  variantId = variant.id;

  const product2 = await prisma.product.create({
    data: {
      vendorId: vendorId,
      categoryId: category.id,
      name: 'Widget B',
      description: 'Test product 2',
      basePrice: 50,
      images: [],
      isActive: true,
    },
  });

  const variant2 = await prisma.variant.create({
    data: { productId: product2.id, price: 50, stock: 100, sku: 'ANA-SKU-002' },
  });
  variant2Id = variant2.id;

  // Product for vendor 2 (for isolation test)
  const vendor2Product = await prisma.product.create({
    data: {
      vendorId: vendor2Id,
      categoryId: category.id,
      name: 'Vendor 2 Widget',
      description: 'Vendor 2 product',
      basePrice: 200,
      images: [],
      isActive: true,
    },
  });
  const vendor2Variant = await prisma.variant.create({
    data: { productId: vendor2Product.id, price: 200, stock: 100, sku: 'ANA-SKU-003' },
  });

  // Address for customer
  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: 'Analytics Customer',
      phone: '555-0001',
      street: '1 Test St',
      city: 'Testville',
      state: 'CA',
      country: 'US',
      zipCode: '90001',
    },
  });

  // Seed orders for vendor 1:
  // 3 DELIVERED orders — Widget A (x2 = $200), Widget A (x1 = $100), Widget B (x1 = $50)
  // 1 CANCELLED order — Widget A (x1 = $100) — should be excluded from revenue
  const base = new Date('2026-01-15T10:00:00Z');
  const day2 = new Date('2026-01-16T10:00:00Z');
  const day3 = new Date('2026-01-17T10:00:00Z');
  const day4 = new Date('2026-01-18T10:00:00Z');

  await createVendorOrder({
    vendorId, customerId: customer.id, addressId: address.id,
    variantId, quantity: 2, unitPrice: 100,
    status: 'DELIVERED', vendorProfileId, createdAt: base,
  });
  await createVendorOrder({
    vendorId, customerId: customer.id, addressId: address.id,
    variantId, quantity: 1, unitPrice: 100,
    status: 'DELIVERED', vendorProfileId, createdAt: day2,
  });
  await createVendorOrder({
    vendorId, customerId: customer.id, addressId: address.id,
    variantId: variant2Id, quantity: 1, unitPrice: 50,
    status: 'DELIVERED', vendorProfileId, createdAt: day3,
  });
  await createVendorOrder({
    vendorId, customerId: customer.id, addressId: address.id,
    variantId, quantity: 1, unitPrice: 100,
    status: 'CANCELLED', createdAt: day4,
  });

  // Vendor 2 order — should NOT appear in vendor 1's analytics
  await createVendorOrder({
    vendorId: vendor2Id, customerId: customer.id, addressId: address.id,
    variantId: vendor2Variant.id, quantity: 1, unitPrice: 200,
    status: 'DELIVERED', createdAt: base,
  });

  // Obtain tokens via login
  const loginVendor = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'vendor.analytics@test.com', password: 'test1234' });
  vendorToken = loginVendor.body.data.tokens.accessToken;

  const loginCustomer = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'customer.analytics@test.com', password: 'test1234' });
  customerToken = loginCustomer.body.data.tokens.accessToken;

  const loginUnapproved = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'unapproved.analytics@test.com', password: 'test1234' });
  unapprovedVendorToken = loginUnapproved.body.data.tokens.accessToken;
});

afterAll(async () => {
  await cleanAnalyticsData();
  await teardownTestDB();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/analytics/vendor/summary
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/analytics/vendor/summary', () => {
  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/analytics/vendor/summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 for CUSTOMER role', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for unapproved vendor', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .set('Authorization', `Bearer ${unapprovedVendorToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 when startDate > endDate', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .query({ startDate: '2026-02-01T00:00:00Z', endDate: '2026-01-01T00:00:00Z' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('startDate');
  });

  it('returns 400 when date range exceeds 366 days', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .query({ startDate: '2024-01-01T00:00:00Z', endDate: '2026-01-01T00:00:00Z' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('endDate');
  });

  it('returns correct totals for approved vendor', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { orders, revenue } = res.body.data;
    // 3 DELIVERED + 1 CANCELLED = 4 total; billable excludes CANCELLED
    expect(orders.totalOrders).toBe(4);
    expect(orders.billableOrders).toBe(3);
    expect(orders.byStatus.DELIVERED).toBe(3);
    expect(orders.byStatus.CANCELLED).toBe(1);

    // Gross revenue excludes CANCELLED: $200 + $100 + $50 = $350
    expect(revenue.gross).toBe('350.00');
    // Net and commission from VendorEarnings (3 TRANSFERRED @ 10%):
    // gross=200 → net=180, gross=100 → net=90, gross=50 → net=45 → total net=315
    expect(revenue.net).toBe('315.00');
    expect(revenue.commission).toBe('35.00');
  });

  it('filters by date range', async () => {
    // Only include orders from Jan 15 (day 1)
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .query({
        startDate: '2026-01-15T00:00:00Z',
        endDate: '2026-01-16T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    const { orders, revenue } = res.body.data;
    expect(orders.totalOrders).toBe(1);
    expect(orders.billableOrders).toBe(1);
    expect(revenue.gross).toBe('200.00');
  });

  it('does not include vendor 2 orders in vendor 1 summary', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/summary')
      .set('Authorization', `Bearer ${vendorToken}`);

    const { revenue } = res.body.data;
    // Vendor 2 has a $200 order; if isolation fails, gross would be $550
    expect(parseFloat(revenue.gross)).toBeLessThan(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/analytics/vendor/sales
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/analytics/vendor/sales', () => {
  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/analytics/vendor/sales');
    expect(res.status).toBe(401);
  });

  it('returns 403 for unapproved vendor', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .set('Authorization', `Bearer ${unapprovedVendorToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid period value', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .query({ period: 'quarter' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when startDate > endDate', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .query({ startDate: '2026-02-01T00:00:00Z', endDate: '2026-01-01T00:00:00Z' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(400);
  });

  it('returns day-bucketed series with correct counts and revenue', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .query({
        period: 'day',
        startDate: '2026-01-15T00:00:00Z',
        endDate: '2026-01-19T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    const { period, series } = res.body.data;
    expect(period).toBe('day');

    // 3 DELIVERED orders spread across 3 days (CANCELLED excluded)
    expect(series.length).toBe(3);

    const day1 = series.find((s: { periodStart: string }) => s.periodStart === '2026-01-15');
    const day2 = series.find((s: { periodStart: string }) => s.periodStart === '2026-01-16');
    const day3 = series.find((s: { periodStart: string }) => s.periodStart === '2026-01-17');

    expect(day1).toBeDefined();
    expect(day1.orderCount).toBe(1);
    expect(day1.revenue).toBe('200.00');

    expect(day2).toBeDefined();
    expect(day2.orderCount).toBe(1);
    expect(day2.revenue).toBe('100.00');

    expect(day3).toBeDefined();
    expect(day3.orderCount).toBe(1);
    expect(day3.revenue).toBe('50.00');
  });

  it('returns month-bucketed series', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .query({
        period: 'month',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-02-01T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    const { series } = res.body.data;
    // All 3 delivered orders fall in January
    expect(series.length).toBe(1);
    expect(series[0].periodStart).toBe('2026-01-01');
    expect(series[0].orderCount).toBe(3);
    expect(series[0].revenue).toBe('350.00');
  });

  it('returns empty series when no orders in range', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .query({
        period: 'day',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.series).toEqual([]);
  });

  it('excludes vendor 2 orders from vendor 1 series', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/sales')
      .query({
        period: 'day',
        startDate: '2026-01-15T00:00:00Z',
        endDate: '2026-01-16T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    // Vendor 1 has $200 on Jan 15; vendor 2 also has $200 on Jan 15
    // Isolation: vendor 1 series should show $200, not $400
    const day1 = res.body.data.series[0];
    expect(day1.revenue).toBe('200.00');
    expect(day1.orderCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/analytics/vendor/top-products
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/analytics/vendor/top-products', () => {
  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/analytics/vendor/top-products');
    expect(res.status).toBe(401);
  });

  it('returns 403 for unapproved vendor', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .set('Authorization', `Bearer ${unapprovedVendorToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 when startDate > endDate', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .query({ startDate: '2026-02-01T00:00:00Z', endDate: '2026-01-01T00:00:00Z' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(400);
  });

  it('returns top products ranked by revenue with correct shape', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    const { products } = res.body.data;

    // Widget A: $200 + $100 = $300 (rank 1)
    // Widget B: $50 (rank 2)
    expect(products.length).toBe(2);
    expect(products[0].rank).toBe(1);
    expect(products[0].productName).toBe('Widget A');
    expect(products[0].totalRevenue).toBe('300.00');
    expect(products[0].orderCount).toBe(2);

    expect(products[1].rank).toBe(2);
    expect(products[1].productName).toBe('Widget B');
    expect(products[1].totalRevenue).toBe('50.00');
    expect(products[1].orderCount).toBe(1);
  });

  it('returns at most limit products (default 5)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeLessThanOrEqual(5);
  });

  it('respects custom limit param', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .query({ limit: '1' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    // Should be the highest-revenue product
    expect(res.body.data.products[0].productName).toBe('Widget A');
  });

  it('returns 400 for limit > 20', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .query({ limit: '25' })
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(400);
  });

  it('filters by date range', async () => {
    // Only include Jan 15 — Widget A ($200) only
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .query({
        startDate: '2026-01-15T00:00:00Z',
        endDate: '2026-01-16T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    const { products } = res.body.data;
    expect(products.length).toBe(1);
    expect(products[0].productName).toBe('Widget A');
    expect(products[0].totalRevenue).toBe('200.00');
  });

  it('returns empty array when no valid orders in range', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .query({
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T00:00:00Z',
      })
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([]);
  });

  it('excludes vendor 2 products from vendor 1 top products', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/vendor/top-products')
      .set('Authorization', `Bearer ${vendorToken}`);

    const names = res.body.data.products.map((p: { productName: string }) => p.productName);
    expect(names).not.toContain('Vendor 2 Widget');
  });
});

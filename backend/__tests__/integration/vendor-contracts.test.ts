import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanDatabase } from '../../src/__tests__/setup';

const password = 'test1234';
let approvedToken: string;
let secondVendorToken: string;
let pendingToken: string;
let customerToken: string;
let approvedVendorId: string;
let categoryId: string;
let activeProductId: string;
let inactiveProductId: string;
let orderedVariantId: string;
let unreferencedVariantId: string;
let secondSkuVariantId: string;
let vendorOrderId: string;

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  expect(response.status).toBe(200);
  return `Bearer ${response.body.data.tokens.accessToken}`;
}

beforeAll(async () => {
  await cleanDatabase();
  const passwordHash = await bcrypt.hash(password, 10);
  const [approvedVendor, secondVendor, pendingVendor, customer] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: 'Approved Vendor',
          email: 'contracts.vendor@example.com',
          password: passwordHash,
          role: 'VENDOR',
          isVerified: true,
          vendorProfile: {
            create: { storeName: 'Contract Store', status: 'APPROVED' },
          },
        },
      }),
      prisma.user.create({
        data: {
          name: 'Second Vendor',
          email: 'contracts.vendor2@example.com',
          password: passwordHash,
          role: 'VENDOR',
          isVerified: true,
          vendorProfile: {
            create: { storeName: 'Second Contract Store', status: 'APPROVED' },
          },
        },
      }),
      prisma.user.create({
        data: {
          name: 'Pending Vendor',
          email: 'contracts.pending@example.com',
          password: passwordHash,
          role: 'VENDOR',
          isVerified: true,
          vendorProfile: {
            create: { storeName: 'Pending Contract Store', status: 'PENDING' },
          },
        },
      }),
      prisma.user.create({
        data: {
          name: 'Contract Customer',
          email: 'contracts.customer@example.com',
          password: passwordHash,
          role: 'CUSTOMER',
          isVerified: true,
        },
      }),
    ]);
  approvedVendorId = approvedVendor.id;

  const category = await prisma.category.create({
    data: { name: 'Contract Products', slug: 'contract-products' },
  });
  categoryId = category.id;

  const activeProduct = await prisma.product.create({
    data: {
      vendorId: approvedVendor.id,
      categoryId,
      name: 'Alpha Active Product',
      description: 'Active product used by vendor contract tests.',
      basePrice: 20,
      isActive: true,
      variants: {
        create: [
          { sku: 'CONTRACT-ORDERED', price: 20, stock: 10 },
          { sku: 'CONTRACT-SECOND', price: 25, stock: 3 },
        ],
      },
    },
    include: { variants: true },
  });
  activeProductId = activeProduct.id;
  orderedVariantId = activeProduct.variants[0]!.id;
  secondSkuVariantId = activeProduct.variants[1]!.id;

  const inactiveProduct = await prisma.product.create({
    data: {
      vendorId: approvedVendor.id,
      categoryId,
      name: 'Zulu Archived Product',
      description: 'Inactive product used by vendor inventory tests.',
      basePrice: 10,
      isActive: false,
      variants: {
        create: { sku: 'ARCHIVE-SKU', price: 10, stock: 0 },
      },
    },
    include: { variants: true },
  });
  inactiveProductId = inactiveProduct.id;
  unreferencedVariantId = inactiveProduct.variants[0]!.id;

  await prisma.product.create({
    data: {
      vendorId: secondVendor.id,
      categoryId,
      name: 'Other Vendor Product',
      description: 'Must never appear in the first vendor inventory.',
      basePrice: 99,
      isActive: false,
      variants: { create: { sku: 'OTHER-VENDOR-SKU', price: 99, stock: 1 } },
    },
  });

  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: customer.name,
      phone: '555-0100',
      street: '129 Contract Street',
      city: 'Test City',
      state: 'TS',
      country: 'US',
      zipCode: '10001',
    },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-CONTRACT-129',
      userId: customer.id,
      addressId: address.id,
      shippingAddress: {
        fullName: customer.name,
        phone: '555-0100',
        street: '129 Contract Street',
        city: 'Test City',
        state: 'TS',
        country: 'US',
        zipCode: '10001',
      },
      subtotal: 20,
      total: 20,
    },
  });
  const vendorOrder = await prisma.vendorOrder.create({
    data: {
      orderId: order.id,
      vendorId: approvedVendor.id,
      subtotal: 20,
      items: {
        create: {
          variantId: orderedVariantId,
          quantity: 1,
          unitPrice: 20,
          totalPrice: 20,
        },
      },
    },
  });
  vendorOrderId = vendorOrder.id;

  [approvedToken, secondVendorToken, pendingToken, customerToken] =
    await Promise.all([
      login(approvedVendor.email),
      login(secondVendor.email),
      login(pendingVendor.email),
      login(customer.email),
    ]);
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('GET /api/v1/products/vendor', () => {
  it('requires an approved vendor account', async () => {
    expect((await request(app).get('/api/v1/products/vendor')).status).toBe(
      401
    );
    expect(
      (
        await request(app)
          .get('/api/v1/products/vendor')
          .set('Authorization', customerToken)
      ).status
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/api/v1/products/vendor')
          .set('Authorization', pendingToken)
      ).status
    ).toBe(403);
  });

  it('derives ownership from the session and includes filtered inactive inventory', async () => {
    const response = await request(app)
      .get('/api/v1/products/vendor')
      .query({
        page: 1,
        limit: 1,
        search: 'archive-sku',
        isActive: false,
        inStock: false,
        sortBy: 'name',
        sortOrder: 'asc',
      })
      .set('Authorization', approvedToken);

    expect(response.status).toBe(200);
    expect(response.body.data.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
    });
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      id: inactiveProductId,
      vendorId: approvedVendorId,
      isActive: false,
    });
  });

  it('paginates and sorts only the authenticated vendor inventory', async () => {
    const response = await request(app)
      .get('/api/v1/products/vendor')
      .query({ page: 2, limit: 1, sortBy: 'name', sortOrder: 'asc' })
      .set('Authorization', approvedToken);

    expect(response.status).toBe(200);
    expect(response.body.data.meta).toMatchObject({
      page: 2,
      limit: 1,
      total: 2,
    });
    expect(response.body.data.items[0].id).toBe(inactiveProductId);
  });

  it.each([
    ['page', 'abc'],
    ['limit', 'not-a-number'],
    ['isActive', 'sometimes'],
    ['inStock', 'yes'],
  ])('rejects malformed %s query values', async (field, value) => {
    const response = await request(app)
      .get('/api/v1/products/vendor')
      .query({ [field]: value })
      .set('Authorization', approvedToken);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Query validation failed',
    });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })])
    );
  });
});

describe('GET /api/v1/orders/vendor/:id', () => {
  it('returns a direct-load vendor-owned detail shape', async () => {
    const response = await request(app)
      .get(`/api/v1/orders/vendor/${vendorOrderId}`)
      .set('Authorization', approvedToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: vendorOrderId,
      vendorId: approvedVendorId,
      order: {
        orderNumber: 'ORD-CONTRACT-129',
        user: { email: 'contracts.customer@example.com' },
      },
    });
    expect(response.body.data.items[0].variant.product.id).toBe(
      activeProductId
    );
  });

  it('returns stable not-found, forbidden, and approval errors', async () => {
    const missing = await request(app)
      .get('/api/v1/orders/vendor/00000000-0000-0000-0000-000000000000')
      .set('Authorization', approvedToken);
    expect(missing.status).toBe(404);

    const foreign = await request(app)
      .get(`/api/v1/orders/vendor/${vendorOrderId}`)
      .set('Authorization', secondVendorToken);
    expect(foreign.status).toBe(403);

    const pending = await request(app)
      .get(`/api/v1/orders/vendor/${vendorOrderId}`)
      .set('Authorization', pendingToken);
    expect(pending.status).toBe(403);
  });
});

describe('vendor product mutation contracts', () => {
  it('rejects empty product and variant update payloads', async () => {
    const product = await request(app)
      .put(`/api/v1/products/${activeProductId}`)
      .set('Authorization', approvedToken)
      .send({});
    expect(product.status).toBe(400);
    expect(product.body).toMatchObject({
      success: false,
      message: 'Validation failed',
    });

    const variant = await request(app)
      .put(`/api/v1/products/${activeProductId}/variants/${orderedVariantId}`)
      .set('Authorization', approvedToken)
      .send({});
    expect(variant.status).toBe(400);
    expect(variant.body).toMatchObject({
      success: false,
      message: 'Validation failed',
    });
  });

  it.each([
    [
      'put',
      (): string => '/api/v1/products/not-a-uuid',
      { name: 'Valid Name' },
    ],
    ['delete', (): string => '/api/v1/products/not-a-uuid', undefined],
    [
      'post',
      (): string => '/api/v1/products/not-a-uuid/variants',
      { sku: 'INVALID-PATH-SKU', price: 10, stock: 1 },
    ],
    [
      'put',
      (): string => `/api/v1/products/${activeProductId}/variants/not-a-uuid`,
      { stock: 2 },
    ],
  ] as const)(
    'returns 400 for malformed mutation path: %s',
    async (method, pathForTest, body) => {
      const pendingRequest = request(app)
        [method](pathForTest())
        .set('Authorization', approvedToken);
      if (body) pendingRequest.send(body);
      const response = await pendingRequest;

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid route parameter');
    }
  );

  it('maps nested create and variant SKU conflicts to safe field errors', async () => {
    const create = await request(app)
      .post('/api/v1/products')
      .set('Authorization', approvedToken)
      .send({
        categoryId,
        name: 'Duplicate SKU Product',
        description: 'This create intentionally reuses an existing SKU.',
        basePrice: 20,
        variants: [{ sku: 'CONTRACT-ORDERED', price: 20, stock: 1 }],
      });
    expect(create.status).toBe(409);
    expect(create.body.errors).toContainEqual({
      field: 'variants',
      message: 'SKU must be unique',
    });

    const add = await request(app)
      .post(`/api/v1/products/${activeProductId}/variants`)
      .set('Authorization', approvedToken)
      .send({ sku: 'CONTRACT-ORDERED', price: 20, stock: 1 });
    expect(add.status).toBe(409);
    expect(add.body.errors).toContainEqual({
      field: 'sku',
      message: 'SKU must be unique',
    });

    const update = await request(app)
      .put(`/api/v1/products/${activeProductId}/variants/${secondSkuVariantId}`)
      .set('Authorization', approvedToken)
      .send({ sku: 'CONTRACT-ORDERED' });
    expect(update.status).toBe(409);
  });

  it('deletes unreferenced variants but preserves order history with 409 conflicts', async () => {
    const deleted = await request(app)
      .delete(
        `/api/v1/products/${inactiveProductId}/variants/${unreferencedVariantId}`
      )
      .set('Authorization', approvedToken);
    expect(deleted.status).toBe(200);
    expect(
      await prisma.variant.findUnique({ where: { id: unreferencedVariantId } })
    ).toBeNull();

    const orderedVariant = await request(app)
      .delete(
        `/api/v1/products/${activeProductId}/variants/${orderedVariantId}`
      )
      .set('Authorization', approvedToken);
    expect(orderedVariant.status).toBe(409);
    expect(orderedVariant.body.message).toMatch(/order history/i);

    const orderedProduct = await request(app)
      .delete(`/api/v1/products/${activeProductId}`)
      .set('Authorization', approvedToken);
    expect(orderedProduct.status).toBe(409);
    expect(orderedProduct.body.message).toMatch(/order history/i);
  });

  it('enforces ownership for variant deletion', async () => {
    const response = await request(app)
      .delete(
        `/api/v1/products/${activeProductId}/variants/${orderedVariantId}`
      )
      .set('Authorization', secondVendorToken);
    expect(response.status).toBe(403);
  });

  it('maps duplicate store names to a safe field conflict', async () => {
    const response = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', secondVendorToken)
      .send({ storeName: '  CONTRACT STORE  ' });

    expect(response.status).toBe(409);
    expect(response.body.errors).toContainEqual({
      field: 'storeName',
      message: 'Store name must be unique',
    });
  });

  it('maps normalized duplicate store names during registration', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Duplicate Store Vendor',
      email: 'duplicate.store.contract@example.com',
      password,
      role: 'VENDOR',
      storeName: ' contract store ',
    });

    expect(response.status).toBe(409);
    expect(response.body.errors).toContainEqual({
      field: 'storeName',
      message: 'Store name must be unique',
    });
  });
});

import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanDatabase } from '../../src/__tests__/setup';
import { generateTokenPair } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';

let adminToken: string;
let customerToken: string;
let customerId: string;
let vendorOneUserId: string;
let vendorOneProfileId: string;
let vendorTwoUserId: string;
let vendorTwoProfileId: string;
let pendingVendorProfileId: string;
let inactiveProductId: string;
let secondProductId: string;
let mixedOrderId: string;
let singleOrderId: string;

const auth = (token: string) => `Bearer ${token}`;

beforeAll(async () => {
  await cleanDatabase();
  const password = await hashPassword('test1234');

  const [admin, customer, vendorOne, vendorTwo, pendingVendor] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: 'Contract Admin',
          email: 'admin.134@example.com',
          password,
          role: 'ADMIN',
          isVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          name: 'Contract Customer',
          email: 'customer.134@example.com',
          password,
          role: 'CUSTOMER',
          isVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          name: 'First Vendor Owner',
          email: 'owner.first.134@example.com',
          password,
          role: 'VENDOR',
          isVerified: true,
          vendorProfile: {
            create: {
              storeName: 'Alpha Contract Store',
              description: 'First contract vendor',
              status: 'APPROVED',
              bankDetails: { accountNumber: 'must-not-leak' },
              paymentProvider: 'STRIPE',
              settlementCountry: 'US',
              providerAccountId: 'acct_contract_134_first',
            },
          },
        },
        include: { vendorProfile: true },
      }),
      prisma.user.create({
        data: {
          name: 'Second Vendor Owner',
          email: 'owner.second.134@example.com',
          password,
          role: 'VENDOR',
          isVerified: true,
          vendorProfile: {
            create: {
              storeName: 'Beta Contract Store',
              status: 'APPROVED',
            },
          },
        },
        include: { vendorProfile: true },
      }),
      prisma.user.create({
        data: {
          name: 'Pending Vendor Owner',
          email: 'owner.pending.134@example.com',
          password,
          role: 'VENDOR',
          isVerified: true,
          vendorProfile: {
            create: {
              storeName: 'Pending Contract Store',
              status: 'PENDING',
              storeLogo: 'https://cdn.example.com/pending-logo.webp',
              storeLogoPublicId: 'vendors/pending-logo',
              storeBanner: 'https://cdn.example.com/pending-banner.webp',
              storeBannerPublicId: 'vendors/pending-banner',
              paymentProvider: 'STRIPE',
              settlementCountry: 'US',
              providerAccountId: 'acct_contract_134_pending',
              bankDetails: { accountNumber: 'pending-must-not-leak' },
            },
          },
        },
        include: { vendorProfile: true },
      }),
    ]);

  customerId = customer.id;
  vendorOneUserId = vendorOne.id;
  vendorOneProfileId = vendorOne.vendorProfile!.id;
  vendorTwoUserId = vendorTwo.id;
  vendorTwoProfileId = vendorTwo.vendorProfile!.id;
  pendingVendorProfileId = pendingVendor.vendorProfile!.id;

  adminToken = generateTokenPair({
    userId: admin.id,
    email: admin.email,
    role: admin.role,
  }).accessToken;
  customerToken = generateTokenPair({
    userId: customer.id,
    email: customer.email,
    role: customer.role,
  }).accessToken;

  const category = await prisma.category.create({
    data: { name: 'Admin Contract Category', slug: 'admin-contract-category' },
  });
  const stableTimestamp = new Date('2026-01-01T00:00:00.000Z');
  const [firstProduct, secondProduct] = await Promise.all([
    prisma.product.create({
      data: {
        vendorId: vendorOne.id,
        categoryId: category.id,
        name: 'Inactive Moderation Product',
        description: 'Complete product detail contract',
        basePrice: 42.5,
        images: ['https://cdn.example.com/product-one.webp'],
        isActive: false,
        avgRating: 4.25,
        reviewCount: 8,
        tags: ['moderation', 'inactive'],
        createdAt: stableTimestamp,
        variants: {
          create: [
            {
              sku: 'ADMIN-134-FIRST',
              size: 'M',
              color: 'Blue',
              price: 45,
              stock: 7,
              createdAt: stableTimestamp,
            },
            {
              sku: 'ADMIN-134-FIRST-ALT',
              size: 'L',
              color: 'Black',
              price: 47,
              stock: 2,
              createdAt: stableTimestamp,
            },
          ],
        },
      },
      include: { variants: true },
    }),
    prisma.product.create({
      data: {
        vendorId: vendorTwo.id,
        categoryId: category.id,
        name: 'Second Vendor Product',
        description: 'Second product for a mixed order',
        basePrice: 30,
        createdAt: stableTimestamp,
        variants: {
          create: {
            sku: 'ADMIN-134-SECOND',
            price: 30,
            stock: 4,
            createdAt: stableTimestamp,
          },
        },
      },
      include: { variants: true },
    }),
  ]);
  inactiveProductId = firstProduct.id;
  secondProductId = secondProduct.id;

  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: customer.name,
      phone: '555-0134',
      street: '134 Contract Street',
      city: 'Contract City',
      state: 'TS',
      country: 'US',
      zipCode: '10134',
    },
  });
  const shippingAddress = {
    fullName: customer.name,
    phone: '555-0134',
    street: '134 Contract Street',
    city: 'Contract City',
    state: 'TS',
    country: 'US',
    zipCode: '10134',
  };

  const mixedOrder = await prisma.order.create({
    data: {
      orderNumber: 'ORD-ADMIN-134-MIXED',
      userId: customer.id,
      addressId: address.id,
      shippingAddress,
      subtotal: 75,
      total: 75,
      paymentProvider: 'STRIPE',
      createdAt: stableTimestamp,
      vendorOrders: {
        create: [
          {
            vendorId: vendorOne.id,
            status: 'SHIPPED',
            subtotal: 45,
            createdAt: stableTimestamp,
            items: {
              create: {
                variantId: firstProduct.variants.find(
                  (variant) => variant.sku === 'ADMIN-134-FIRST'
                )!.id,
                quantity: 1,
                unitPrice: 45,
                totalPrice: 45,
              },
            },
          },
          {
            vendorId: vendorTwo.id,
            status: 'PENDING',
            subtotal: 30,
            createdAt: stableTimestamp,
            items: {
              create: {
                variantId: secondProduct.variants[0]!.id,
                quantity: 1,
                unitPrice: 30,
                totalPrice: 30,
              },
            },
          },
        ],
      },
    },
  });
  mixedOrderId = mixedOrder.id;

  const singleOrder = await prisma.order.create({
    data: {
      orderNumber: 'ORD-ADMIN-134-SINGLE',
      userId: customer.id,
      addressId: address.id,
      shippingAddress,
      subtotal: 45,
      total: 45,
      paymentProvider: 'STRIPE',
      createdAt: stableTimestamp,
      vendorOrders: {
        create: {
          vendorId: vendorOne.id,
          status: 'PENDING',
          subtotal: 45,
          createdAt: stableTimestamp,
          items: {
            create: {
              variantId: firstProduct.variants.find(
                (variant) => variant.sku === 'ADMIN-134-FIRST'
              )!.id,
              quantity: 1,
              unitPrice: 45,
              totalPrice: 45,
            },
          },
        },
      },
    },
  });
  singleOrderId = singleOrder.id;
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('admin direct-load detail contracts', () => {
  it('returns safe user detail and distinguishes the owner user from vendor profile', async () => {
    const response = await request(app)
      .get(`/api/v1/admin/users/${vendorOneUserId}`)
      .set('Authorization', auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: vendorOneUserId,
      email: 'owner.first.134@example.com',
      vendorProfile: {
        id: vendorOneProfileId,
        userId: vendorOneUserId,
        storeName: 'Alpha Contract Store',
      },
    });
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.fcmToken).toBeUndefined();
    expect(response.body.data.vendorProfile.bankDetails).toBeUndefined();
    expect(response.body.data.vendorProfile.providerAccountId).toBeUndefined();
  });

  it('searches vendors by store name and owner email and returns safe detail', async () => {
    for (const search of ['Alpha Contract', 'owner.first.134@example.com']) {
      const list = await request(app)
        .get('/api/v1/admin/vendors')
        .query({ search })
        .set('Authorization', auth(adminToken));
      expect(list.status).toBe(200);
      expect(
        list.body.data.items.map((item: { id: string }) => item.id)
      ).toContain(vendorOneProfileId);
    }

    const detail = await request(app)
      .get(`/api/v1/admin/vendors/${vendorOneProfileId}`)
      .set('Authorization', auth(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      id: vendorOneProfileId,
      userId: vendorOneUserId,
      user: { id: vendorOneUserId },
    });
    expect(detail.body.data.bankDetails).toBeUndefined();
    expect(detail.body.data.providerAccountId).toBeUndefined();

    const userIdIsNotAProfileId = await request(app)
      .get(`/api/v1/admin/vendors/${vendorOneUserId}`)
      .set('Authorization', auth(adminToken));
    expect(userIdIsNotAProfileId.status).toBe(404);
  });

  it('returns complete inactive product moderation detail', async () => {
    const response = await request(app)
      .get(`/api/v1/admin/products/${inactiveProductId}`)
      .set('Authorization', auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: inactiveProductId,
      isActive: false,
      images: ['https://cdn.example.com/product-one.webp'],
      tags: ['moderation', 'inactive'],
      avgRating: '4.25',
      reviewCount: 8,
      vendor: {
        id: vendorOneUserId,
        vendorProfile: { id: vendorOneProfileId },
      },
      category: { slug: 'admin-contract-category' },
      variants: expect.arrayContaining([
        expect.objectContaining({ sku: 'ADMIN-134-FIRST', stock: 7 }),
      ]),
    });

    const variantIds = response.body.data.variants.map(
      (variant: { id: string }) => variant.id
    );
    expect(variantIds).toEqual([...variantIds].sort());
  });

  it('treats vendorId filters as owner user IDs, not vendor-profile IDs', async () => {
    const [ownerProducts, profileProducts, ownerOrders, profileOrders] =
      await Promise.all([
        request(app)
          .get('/api/v1/admin/products')
          .query({ vendorId: vendorOneUserId })
          .set('Authorization', auth(adminToken)),
        request(app)
          .get('/api/v1/admin/products')
          .query({ vendorId: vendorOneProfileId })
          .set('Authorization', auth(adminToken)),
        request(app)
          .get('/api/v1/admin/orders')
          .query({ vendorId: vendorOneUserId })
          .set('Authorization', auth(adminToken)),
        request(app)
          .get('/api/v1/admin/orders')
          .query({ vendorId: vendorOneProfileId })
          .set('Authorization', auth(adminToken)),
      ]);

    expect(ownerProducts.body.data.items).not.toHaveLength(0);
    expect(profileProducts.body.data.items).toHaveLength(0);
    expect(ownerOrders.body.data.items).not.toHaveLength(0);
    expect(profileOrders.body.data.items).toHaveLength(0);
  });

  it('enforces admin authorization, validates IDs, and returns stable not-found errors', async () => {
    const forbidden = await request(app)
      .get(`/api/v1/admin/users/${customerId}`)
      .set('Authorization', auth(customerToken));
    expect(forbidden.status).toBe(403);

    const invalid = await request(app)
      .get('/api/v1/admin/products/not-a-uuid')
      .set('Authorization', auth(adminToken));
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ success: false });

    const missing = await request(app)
      .get('/api/v1/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', auth(adminToken));
    expect(missing.status).toBe(404);
  });
});

describe('admin multi-vendor order contract', () => {
  it('returns per-vendor statuses and a MIXED order summary', async () => {
    const response = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', auth(adminToken));

    expect(response.status).toBe(200);
    const mixed = response.body.data.items.find(
      (item: { id: string }) => item.id === mixedOrderId
    );
    expect(mixed.fulfillmentStatus).toEqual({
      kind: 'MIXED',
      status: null,
      statuses: ['PENDING', 'SHIPPED'],
    });
    expect(mixed.vendorOrders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          vendorId: vendorOneUserId,
          status: 'SHIPPED',
        }),
        expect.objectContaining({
          vendorId: vendorTwoUserId,
          status: 'PENDING',
        }),
      ])
    );

    const expectedOrderIds = [mixedOrderId, singleOrderId].sort().reverse();
    expect(
      response.body.data.items.map((item: { id: string }) => item.id)
    ).toEqual(expectedOrderIds);
  });

  it('applies status and vendor filters to the same vendor sub-order', async () => {
    const response = await request(app)
      .get('/api/v1/admin/orders')
      .query({ status: 'PENDING', vendorId: vendorOneUserId })
      .set('Authorization', auth(adminToken));

    expect(response.status).toBe(200);
    expect(
      response.body.data.items.map((item: { id: string }) => item.id)
    ).toEqual([singleOrderId]);
    expect(response.body.data.items[0].fulfillmentStatus).toEqual({
      kind: 'SINGLE',
      status: 'PENDING',
      statuses: ['PENDING'],
    });
  });

  it('returns complete order detail with the same fulfillment summary', async () => {
    const response = await request(app)
      .get(`/api/v1/admin/orders/${mixedOrderId}`)
      .set('Authorization', auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data.fulfillmentStatus).toEqual({
      kind: 'MIXED',
      status: null,
      statuses: ['PENDING', 'SHIPPED'],
    });
    expect(response.body.data.shippingAddress).toMatchObject({
      street: '134 Contract Street',
    });
    expect(response.body.data.vendorOrders).toHaveLength(2);
    const vendorOrderIds = response.body.data.vendorOrders.map(
      (vendorOrder: { id: string }) => vendorOrder.id
    );
    expect(vendorOrderIds).toEqual([...vendorOrderIds].sort());
    expect(
      response.body.data.vendorOrders[0].items[0].variant.product
    ).toHaveProperty('name');
  });
});

describe('admin lifecycle error semantics', () => {
  it('returns least-privilege vendor lifecycle DTOs', async () => {
    const cases: Array<{
      initialStatus: 'PENDING' | 'APPROVED';
      action: 'approve' | 'reject' | 'suspend';
      expectedStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    }> = [
      {
        initialStatus: 'PENDING',
        action: 'approve',
        expectedStatus: 'APPROVED',
      },
      {
        initialStatus: 'PENDING',
        action: 'reject',
        expectedStatus: 'REJECTED',
      },
      {
        initialStatus: 'APPROVED',
        action: 'suspend',
        expectedStatus: 'SUSPENDED',
      },
    ];

    for (const testCase of cases) {
      await prisma.vendorProfile.update({
        where: { id: pendingVendorProfileId },
        data: { status: testCase.initialStatus },
      });
      const response = await request(app)
        .patch(
          `/api/v1/admin/vendors/${pendingVendorProfileId}/${testCase.action}`
        )
        .set('Authorization', auth(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        id: pendingVendorProfileId,
        userId: expect.any(String),
        storeName: 'Pending Contract Store',
        status: testCase.expectedStatus,
      });
      expect(response.body.data.bankDetails).toBeUndefined();
      expect(response.body.data.providerAccountId).toBeUndefined();
      expect(response.body.data.storeLogoPublicId).toBeUndefined();
      expect(response.body.data.storeBannerPublicId).toBeUndefined();
    }

    await prisma.vendorProfile.update({
      where: { id: pendingVendorProfileId },
      data: { status: 'PENDING' },
    });
  });

  it('uses 409 for already-achieved states and 400 for invalid transitions', async () => {
    const alreadyInactive = await request(app)
      .patch(`/api/v1/admin/products/${inactiveProductId}/deactivate`)
      .set('Authorization', auth(adminToken));
    expect(alreadyInactive.status).toBe(409);

    const invalidTransition = await request(app)
      .patch(`/api/v1/admin/vendors/${pendingVendorProfileId}/suspend`)
      .set('Authorization', auth(adminToken));
    expect(invalidTransition.status).toBe(400);
  });

  it('serializes concurrent lifecycle mutations and product deletion', async () => {
    await prisma.vendorProfile.update({
      where: { id: pendingVendorProfileId },
      data: { status: 'PENDING' },
    });
    const approvals = await Promise.all([
      request(app)
        .patch(`/api/v1/admin/vendors/${pendingVendorProfileId}/approve`)
        .set('Authorization', auth(adminToken)),
      request(app)
        .patch(`/api/v1/admin/vendors/${pendingVendorProfileId}/approve`)
        .set('Authorization', auth(adminToken)),
    ]);
    expect(approvals.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);

    await prisma.vendorProfile.update({
      where: { id: pendingVendorProfileId },
      data: { status: 'PENDING' },
    });
    const [approve, reject] = await Promise.all([
      request(app)
        .patch(`/api/v1/admin/vendors/${pendingVendorProfileId}/approve`)
        .set('Authorization', auth(adminToken)),
      request(app)
        .patch(`/api/v1/admin/vendors/${pendingVendorProfileId}/reject`)
        .set('Authorization', auth(adminToken)),
    ]);
    expect(approve.status).toBe(200);
    expect([200, 409]).toContain(reject.status);
    expect(
      (
        await prisma.vendorProfile.findUniqueOrThrow({
          where: { id: pendingVendorProfileId },
          select: { status: true },
        })
      ).status
    ).toBe('APPROVED');

    const concurrentBanUser = await prisma.user.create({
      data: {
        name: 'Concurrent Ban Customer',
        email: 'concurrent.ban.134@example.com',
        password: await hashPassword('test1234'),
        role: 'CUSTOMER',
        isVerified: true,
      },
    });
    const bans = await Promise.all([
      request(app)
        .patch(`/api/v1/admin/users/${concurrentBanUser.id}/ban`)
        .set('Authorization', auth(adminToken)),
      request(app)
        .patch(`/api/v1/admin/users/${concurrentBanUser.id}/ban`)
        .set('Authorization', auth(adminToken)),
    ]);
    expect(bans.map((response) => response.status).sort()).toEqual([200, 409]);

    await prisma.product.update({
      where: { id: secondProductId },
      data: { isActive: true },
    });
    const deactivations = await Promise.all([
      request(app)
        .patch(`/api/v1/admin/products/${secondProductId}/deactivate`)
        .set('Authorization', auth(adminToken)),
      request(app)
        .patch(`/api/v1/admin/products/${secondProductId}/deactivate`)
        .set('Authorization', auth(adminToken)),
    ]);
    expect(deactivations.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);

    const { categoryId } = await prisma.product.findUniqueOrThrow({
      where: { id: secondProductId },
      select: { categoryId: true },
    });
    const deletable = await prisma.product.create({
      data: {
        vendorId: vendorTwoUserId,
        categoryId,
        name: 'Concurrent Delete Product',
        description: 'No order history',
        basePrice: 1,
      },
    });
    const deletions = await Promise.all([
      request(app)
        .delete(`/api/v1/admin/products/${deletable.id}`)
        .set('Authorization', auth(adminToken)),
      request(app)
        .delete(`/api/v1/admin/products/${deletable.id}`)
        .set('Authorization', auth(adminToken)),
    ]);
    expect(deletions.map((response) => response.status).sort()).toEqual([
      204, 404,
    ]);
  });
});

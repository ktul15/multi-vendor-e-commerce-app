import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { generateAccessToken } from '../../utils/jwt';
import { cleanDatabase, setupTestDB, teardownTestDB } from '../setup';

function accessToken(user: {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER' | 'VENDOR';
}) {
  return generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
}

describe('Cross-dashboard authorization boundaries', () => {
  beforeAll(setupTestDB);
  afterAll(teardownTestDB);
  beforeEach(cleanDatabase);

  it('allows admins to read a safe user projection and rejects vendor access', async () => {
    const [admin, vendor, target] = await Promise.all([
      prisma.user.create({
        data: {
          email: 'security-admin@example.com',
          name: 'Security Admin',
          password: 'stored-password-hash',
          role: 'ADMIN',
        },
      }),
      prisma.user.create({
        data: {
          email: 'security-vendor@example.com',
          name: 'Security Vendor',
          password: 'stored-password-hash',
          role: 'VENDOR',
        },
      }),
      prisma.user.create({
        data: {
          email: 'security-target@example.com',
          name: 'Security Target',
          password: 'sensitive-password-hash',
          role: 'CUSTOMER',
        },
      }),
    ]);

    const forbidden = await request(app)
      .get(`/api/v1/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${accessToken(vendor)}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/v1/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${accessToken(admin)}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data).toMatchObject({
      id: target.id,
      email: target.email,
    });
    expect(JSON.stringify(allowed.body)).not.toContain(
      'sensitive-password-hash'
    );
    expect(allowed.body.data).not.toHaveProperty('password');
  });

  it('hides another vendor product and rejects admin/customer use of vendor routes', async () => {
    const [owner, otherVendor, admin, customer, category] = await Promise.all([
      prisma.user.create({
        data: {
          email: 'security-owner@example.com',
          name: 'Security Owner',
          password: 'stored-password-hash',
          role: 'VENDOR',
          vendorProfile: {
            create: { status: 'APPROVED', storeName: 'Security Owner Store' },
          },
        },
      }),
      prisma.user.create({
        data: {
          email: 'security-other-vendor@example.com',
          name: 'Other Vendor',
          password: 'stored-password-hash',
          role: 'VENDOR',
          vendorProfile: {
            create: { status: 'APPROVED', storeName: 'Other Security Store' },
          },
        },
      }),
      prisma.user.create({
        data: {
          email: 'security-admin-2@example.com',
          name: 'Security Admin',
          password: 'stored-password-hash',
          role: 'ADMIN',
        },
      }),
      prisma.user.create({
        data: {
          email: 'security-customer@example.com',
          name: 'Security Customer',
          password: 'stored-password-hash',
          role: 'CUSTOMER',
        },
      }),
      prisma.category.create({
        data: { name: 'Security Category', slug: 'security-category' },
      }),
    ]);
    const product = await prisma.product.create({
      data: {
        basePrice: 10,
        categoryId: category.id,
        description: 'Owned only by the security test vendor.',
        images: [],
        name: 'Private vendor draft',
        tags: [],
        vendorId: owner.id,
      },
    });

    const ownerResponse = await request(app)
      .get(`/api/v1/products/vendor/${product.id}`)
      .set('Authorization', `Bearer ${accessToken(owner)}`);
    expect(ownerResponse.status).toBe(200);

    const otherVendorResponse = await request(app)
      .get(`/api/v1/products/vendor/${product.id}`)
      .set('Authorization', `Bearer ${accessToken(otherVendor)}`);
    expect(otherVendorResponse.status).toBe(404);

    for (const principal of [admin, customer]) {
      const response = await request(app)
        .get(`/api/v1/products/vendor/${product.id}`)
        .set('Authorization', `Bearer ${accessToken(principal)}`);
      expect(response.status).toBe(403);
    }
  });
});

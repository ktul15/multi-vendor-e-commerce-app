import request from 'supertest';
import app from '../../app';
import { setupTestDB, teardownTestDB, cleanDatabase } from '../setup';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';
import { generateTokenPair } from '../../utils/jwt';

async function createUserWithToken(
  role: 'CUSTOMER' | 'VENDOR',
  email: string,
  vendorStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
) {
  const user = await prisma.user.create({
    data: {
      name: `${role} User`,
      email,
      password: await hashPassword('password123'),
      role,
      isVerified: true,
      ...(role === 'VENDOR'
        ? {
            vendorProfile: {
              create: {
                storeName: `${vendorStatus} Store`,
                status: vendorStatus ?? 'PENDING',
              },
            },
          }
        : {}),
    },
  });

  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, accessToken: tokens.accessToken };
}

describe('Vendor Profile API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('PUT /api/v1/vendor-profile/me', () => {
    it('allows PENDING vendors to update their profile', async () => {
      const { accessToken, user } = await createUserWithToken(
        'VENDOR',
        'pending.vendor@example.com',
        'PENDING'
      );

      const res = await request(app)
        .put('/api/v1/vendor-profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          storeName: 'Pending Updated Store',
          description: 'Application profile details.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.storeName).toBe('Pending Updated Store');
      expect(res.body.data.description).toBe('Application profile details.');

      const profile = await prisma.vendorProfile.findUnique({
        where: { userId: user.id },
      });
      expect(profile?.status).toBe('PENDING');
    });

    it('allows APPROVED vendors to update their profile', async () => {
      const { accessToken } = await createUserWithToken(
        'VENDOR',
        'approved.vendor@example.com',
        'APPROVED'
      );

      const res = await request(app)
        .put('/api/v1/vendor-profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ storeName: 'Approved Updated Store' });

      expect(res.status).toBe(200);
      expect(res.body.data.storeName).toBe('Approved Updated Store');
    });

    it.each(['REJECTED', 'SUSPENDED'] as const)(
      'blocks %s vendors from updating their profile',
      async (status) => {
        const { accessToken } = await createUserWithToken(
          'VENDOR',
          `${status.toLowerCase()}.vendor@example.com`,
          status
        );

        const res = await request(app)
          .put('/api/v1/vendor-profile/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storeName: `${status} Updated Store` });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe(
          'Vendor profile cannot be edited in its current status'
        );
      }
    );

    it('blocks customers from updating a vendor profile', async () => {
      const { accessToken } = await createUserWithToken(
        'CUSTOMER',
        'customer.profile@example.com'
      );

      const res = await request(app)
        .put('/api/v1/vendor-profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ storeName: 'Customer Store' });

      expect(res.status).toBe(403);
    });
  });
});

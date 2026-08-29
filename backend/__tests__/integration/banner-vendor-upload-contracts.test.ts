import request from 'supertest';

jest.mock('../../src/utils/cloudinaryUpload', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}));

import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanDatabase } from '../../src/__tests__/setup';
import { generateTokenPair } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';
import { deleteImage, uploadImage } from '../../src/utils/cloudinaryUpload';
import { logger } from '../../src/utils/logger';

const mockedUpload = uploadImage as jest.MockedFunction<typeof uploadImage>;
const mockedDelete = deleteImage as jest.MockedFunction<typeof deleteImage>;
let adminToken: string;
let vendorToken: string;
let vendorUserId: string;

const auth = (token: string) => `Bearer ${token}`;
const image = (name: string) => ({
  url: `https://cdn.example.com/${name}.png`,
  publicId: name,
});
const jpeg = (marker: string) =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from(marker)]);
const png = (marker: string) =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(marker),
  ]);
const webp = (marker: string) =>
  Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBP'),
    Buffer.from(marker),
  ]);

beforeAll(async () => {
  await cleanDatabase();
  const password = await hashPassword('test1234');
  const [admin, vendor] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Upload Contract Admin',
        email: 'upload.contract.admin@example.com',
        password,
        role: 'ADMIN',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Upload Contract Vendor',
        email: 'upload.contract.vendor@example.com',
        password,
        role: 'VENDOR',
        isVerified: true,
        vendorProfile: {
          create: {
            storeName: 'Upload Contract Store',
            status: 'APPROVED',
          },
        },
      },
    }),
  ]);
  vendorUserId = vendor.id;
  adminToken = generateTokenPair({
    userId: admin.id,
    email: admin.email,
    role: admin.role,
  }).accessToken;
  vendorToken = generateTokenPair({
    userId: vendor.id,
    email: vendor.email,
    role: vendor.role,
  }).accessToken;
});

beforeEach(() => {
  mockedUpload.mockReset();
  mockedDelete.mockReset();
  mockedDelete.mockResolvedValue();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('banner multipart contract', () => {
  const createBanner = async (title: string) => {
    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl: `https://cdn.example.com/${title}.png`,
        imagePublicId: `banners/${title}`,
      },
    });
    return banner;
  };

  it('returns a public DTO on create and rolls uploads back observably on DB failure', async () => {
    mockedUpload.mockResolvedValueOnce(image('banners/created'));
    const created = await request(app)
      .post('/api/v1/banners')
      .set('Authorization', auth(adminToken))
      .field('title', 'Created Banner')
      .attach('image', webp('created'), {
        filename: 'created.webp',
        contentType: 'image/webp',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.imagePublicId).toBeUndefined();

    const missingImage = await request(app)
      .post('/api/v1/banners')
      .set('Authorization', auth(adminToken))
      .send({ title: 'Missing Image Banner' });
    expect(missingImage.status).toBe(400);
    expect(missingImage.body.message).toMatch(/image is required/i);

    mockedUpload.mockResolvedValue(image('banners/create-rollback'));
    mockedDelete.mockRejectedValueOnce(new Error('cleanup unavailable'));
    const create = jest
      .spyOn(prisma.banner, 'create')
      .mockRejectedValueOnce(new Error('simulated DB failure'));
    const warning = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .post('/api/v1/banners')
      .set('Authorization', auth(adminToken))
      .field('title', 'Create Rollback Banner')
      .attach('image', png('create-rollback'), {
        filename: 'create-rollback.png',
        contentType: 'image/png',
      });
    create.mockRestore();

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith('banners/create-rollback');
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('banners/create-rollback'),
      expect.objectContaining({ context: 'banner create rollback' })
    );
    warning.mockRestore();
  });

  it('supports text-only, file-only, and mixed updates', async () => {
    const banner = await createBanner('Banner Update Shapes');

    const textOnly = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .send({ title: 'Text Updated Banner' });
    expect(textOnly.status).toBe(200);
    expect(textOnly.body.data.title).toBe('Text Updated Banner');
    expect(textOnly.body.data.imagePublicId).toBeUndefined();

    const jsonFalse = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .send({ isActive: false });
    expect(jsonFalse.status).toBe(200);
    expect(jsonFalse.body.data.isActive).toBe(false);

    mockedUpload.mockResolvedValueOnce(image('banners/file-only'));
    const fileOnly = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .attach('image', webp('file-only'), {
        filename: 'file-only.webp',
        contentType: 'image/webp',
      });
    expect(fileOnly.status).toBe(200);
    expect(fileOnly.body.data.imageUrl).toContain('file-only');
    expect(mockedDelete).toHaveBeenCalledWith('banners/Banner Update Shapes');

    mockedUpload.mockResolvedValueOnce(image('banners/mixed'));
    const mixed = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .field('title', 'Mixed Updated Banner')
      .attach('image', png('mixed'), {
        filename: 'mixed.png',
        contentType: 'image/png',
      });
    expect(mixed.status).toBe(200);
    expect(mixed.body.data.title).toBe('Mixed Updated Banner');

    const clearLink = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .field('linkUrl', '');
    expect(clearLink.status).toBe(200);
    expect(clearLink.body.data.linkUrl).toBeNull();
  });

  it('rejects no-op, invalid-type, oversized, and excess-file requests', async () => {
    const banner = await createBanner('Banner Upload Errors');

    const noOp = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .send({});
    expect(noOp.status).toBe(400);
    expect(noOp.body.message).toMatch(/at least one/i);

    const malformedFields = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .field('position', 'not-a-number')
      .field('isActive', 'not-a-boolean');
    expect(malformedFields.status).toBe(400);
    expect(malformedFields.body).toMatchObject({ success: false });

    for (const position of ['   ', '0x10', '1e3']) {
      const nonDecimalPosition = await request(app)
        .put(`/api/v1/banners/${banner.id}`)
        .set('Authorization', auth(adminToken))
        .field('position', position);
      expect(nonDecimalPosition.status).toBe(400);
    }

    const malformedCreate = await request(app)
      .post('/api/v1/banners')
      .set('Authorization', auth(adminToken))
      .field('title', 'Malformed Create Banner')
      .field('position', 'not-a-number')
      .field('isActive', 'not-a-boolean')
      .attach('image', png('malformed-create'), {
        filename: 'malformed-create.png',
        contentType: 'image/png',
      });
    expect(malformedCreate.status).toBe(400);

    const malformedQuery = await request(app)
      .get('/api/v1/banners/all?page=not-a-number&isActive=not-a-boolean')
      .set('Authorization', auth(adminToken));
    expect(malformedQuery.status).toBe(400);

    const invalid = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .attach('image', Buffer.from('not-an-image'), {
        filename: 'banner.gif',
        contentType: 'image/gif',
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ success: false });
    expect(invalid.body.message).toMatch(/JPEG, PNG and WebP/i);

    const oversized = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'oversized.jpg',
        contentType: 'image/jpeg',
      });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toMatchObject({ success: false });

    const excess = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .attach('image', jpeg('first'), {
        filename: 'first.jpg',
        contentType: 'image/jpeg',
      })
      .attach('image', jpeg('second'), {
        filename: 'second.jpg',
        contentType: 'image/jpeg',
      });
    expect(excess.status).toBe(400);
    expect(excess.body).toMatchObject({ success: false });
  });

  it('rolls back a new upload on DB failure with observable cleanup', async () => {
    const banner = await createBanner('Banner Rollback');
    mockedUpload.mockResolvedValue(image('banners/rollback'));
    mockedDelete.mockRejectedValueOnce(new Error('cleanup unavailable'));
    const transaction = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(new Error('simulated DB failure'));
    const warning = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .attach('image', png('rollback'), {
        filename: 'rollback.png',
        contentType: 'image/png',
      });
    transaction.mockRestore();

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith('banners/rollback');
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('banners/rollback'),
      expect.objectContaining({ context: 'banner update rollback' })
    );
    warning.mockRestore();
  });

  it('keeps committed replacement and deletion successful when cleanup fails', async () => {
    const banner = await createBanner('Banner Cleanup Warning');
    mockedUpload.mockResolvedValue(image('banners/committed'));
    mockedDelete.mockRejectedValue(new Error('cleanup unavailable'));

    const updated = await request(app)
      .put(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken))
      .attach('image', png('committed'), {
        filename: 'committed.png',
        contentType: 'image/png',
      });
    expect(updated.status).toBe(200);

    const deleted = await request(app)
      .delete(`/api/v1/banners/${banner.id}`)
      .set('Authorization', auth(adminToken));
    expect(deleted.status).toBe(204);
    expect(
      await prisma.banner.findUnique({ where: { id: banner.id } })
    ).toBeNull();
  });

  it('serializes concurrent replacements and never deletes the final asset', async () => {
    const banner = await createBanner('Banner Concurrent Media');
    mockedUpload
      .mockResolvedValueOnce(image('banners/concurrent-a'))
      .mockResolvedValueOnce(image('banners/concurrent-b'));

    const responses = await Promise.all([
      request(app)
        .put(`/api/v1/banners/${banner.id}`)
        .set('Authorization', auth(adminToken))
        .attach('image', png('a'), {
          filename: 'a.png',
          contentType: 'image/png',
        }),
      request(app)
        .put(`/api/v1/banners/${banner.id}`)
        .set('Authorization', auth(adminToken))
        .attach('image', png('b'), {
          filename: 'b.png',
          contentType: 'image/png',
        }),
    ]);
    expect(responses.every((response) => response.status === 200)).toBe(true);

    const stored = await prisma.banner.findUniqueOrThrow({
      where: { id: banner.id },
      select: { imagePublicId: true },
    });
    const nonFinal = ['banners/concurrent-a', 'banners/concurrent-b'].find(
      (publicId) => publicId !== stored.imagePublicId
    )!;
    expect(mockedDelete).toHaveBeenCalledWith(
      'banners/Banner Concurrent Media'
    );
    expect(mockedDelete).toHaveBeenCalledWith(nonFinal);
    expect(mockedDelete).not.toHaveBeenCalledWith(stored.imagePublicId!);
  });
});

describe('vendor-profile multipart contract', () => {
  it('supports text-only, file-only, and mixed updates', async () => {
    const textOnly = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .send({ description: 'Text-only profile update' });
    expect(textOnly.status).toBe(200);
    expect(textOnly.body.data.description).toBe('Text-only profile update');
    for (const internalField of [
      'storeLogoPublicId',
      'storeBannerPublicId',
      'providerAccountId',
      'paymentOnboardingStatus',
      'commissionRate',
      'bankDetails',
    ]) {
      expect(textOnly.body.data[internalField]).toBeUndefined();
    }

    const profile = await request(app)
      .get('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken));
    expect(profile.status).toBe(200);
    expect(profile.body.data.user.email).toBe(
      'upload.contract.vendor@example.com'
    );
    expect(profile.body.data.storeLogoPublicId).toBeUndefined();
    expect(profile.body.data.bankDetails).toBeUndefined();

    mockedUpload.mockResolvedValueOnce(image('vendor-profiles/logo'));
    const fileOnly = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .attach('logo', webp('logo'), {
        filename: 'logo.webp',
        contentType: 'image/webp',
      });
    expect(fileOnly.status).toBe(200);
    expect(fileOnly.body.data.storeLogo).toContain('logo');

    mockedUpload.mockResolvedValueOnce(image('vendor-profiles/banner'));
    const mixed = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .field('storeName', 'Mixed Upload Contract Store')
      .attach('banner', png('banner'), {
        filename: 'banner.png',
        contentType: 'image/png',
      });
    expect(mixed.status).toBe(200);
    expect(mixed.body.data.storeName).toBe('Mixed Upload Contract Store');
    expect(mixed.body.data.storeBanner).toContain('banner');
  });

  it('rejects no-op, invalid-type, oversized, and excess-file requests', async () => {
    const noOp = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .send({});
    expect(noOp.status).toBe(400);
    expect(noOp.body.message).toMatch(/at least one/i);

    const invalid = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .attach('logo', Buffer.from('invalid'), {
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toMatch(/JPEG, PNG and WebP/i);

    const oversized = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .attach('banner', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'oversized.png',
        contentType: 'image/png',
      });
    expect(oversized.status).toBe(413);

    const excess = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .attach('logo', png('first'), {
        filename: 'first.png',
        contentType: 'image/png',
      })
      .attach('logo', png('second'), {
        filename: 'second.png',
        contentType: 'image/png',
      });
    expect(excess.status).toBe(400);
    expect(excess.body).toMatchObject({ success: false });
  });

  it('rolls back every new upload when the DB update fails', async () => {
    mockedUpload
      .mockResolvedValueOnce(image('vendor-profiles/rollback-logo'))
      .mockResolvedValueOnce(image('vendor-profiles/rollback-banner'));
    const transaction = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(new Error('simulated DB failure'));

    const response = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .attach('logo', png('logo'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .attach('banner', png('banner'), {
        filename: 'banner.png',
        contentType: 'image/png',
      });
    transaction.mockRestore();

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith('vendor-profiles/rollback-logo');
    expect(mockedDelete).toHaveBeenCalledWith(
      'vendor-profiles/rollback-banner'
    );
  });

  it('keeps a committed profile update successful when cleanup fails', async () => {
    await prisma.vendorProfile.update({
      where: { userId: vendorUserId },
      data: {
        storeBanner: 'https://cdn.example.com/vendor-profiles/old-banner.png',
        storeBannerPublicId: 'vendor-profiles/old-banner',
      },
    });
    mockedUpload.mockResolvedValue(image('vendor-profiles/new-banner'));
    mockedDelete.mockRejectedValueOnce(new Error('cleanup unavailable'));
    const warning = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .put('/api/v1/vendor-profile/me')
      .set('Authorization', auth(vendorToken))
      .attach('banner', png('new-banner'), {
        filename: 'new-banner.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.storeBanner).toContain('new-banner');
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('vendor-profiles/old-banner'),
      expect.objectContaining({
        context: 'vendor profile banner replacement',
      })
    );
    warning.mockRestore();
  });

  it('cleans the actual predecessor during concurrent logo replacements', async () => {
    await prisma.vendorProfile.update({
      where: { userId: vendorUserId },
      data: {
        storeLogo: 'https://cdn.example.com/vendor-profiles/original.png',
        storeLogoPublicId: 'vendor-profiles/original',
      },
    });
    mockedUpload
      .mockResolvedValueOnce(image('vendor-profiles/concurrent-a'))
      .mockResolvedValueOnce(image('vendor-profiles/concurrent-b'));

    const responses = await Promise.all([
      request(app)
        .put('/api/v1/vendor-profile/me')
        .set('Authorization', auth(vendorToken))
        .attach('logo', jpeg('a'), {
          filename: 'a.jpg',
          contentType: 'image/jpeg',
        }),
      request(app)
        .put('/api/v1/vendor-profile/me')
        .set('Authorization', auth(vendorToken))
        .attach('logo', jpeg('b'), {
          filename: 'b.jpg',
          contentType: 'image/jpeg',
        }),
    ]);
    expect(responses.every((response) => response.status === 200)).toBe(true);

    const stored = await prisma.vendorProfile.findUniqueOrThrow({
      where: { userId: vendorUserId },
      select: { storeLogoPublicId: true },
    });
    const nonFinal = [
      'vendor-profiles/concurrent-a',
      'vendor-profiles/concurrent-b',
    ].find((publicId) => publicId !== stored.storeLogoPublicId)!;
    expect(mockedDelete).toHaveBeenCalledWith('vendor-profiles/original');
    expect(mockedDelete).toHaveBeenCalledWith(nonFinal);
    expect(mockedDelete).not.toHaveBeenCalledWith(stored.storeLogoPublicId!);
  });
});

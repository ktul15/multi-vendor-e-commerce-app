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
const auth = (token: string) => `Bearer ${token}`;
const png = () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = () => Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
const webp = () => Buffer.from('RIFF0000WEBP', 'ascii');
const uploadResult = (productId: string, name: string) => ({
  url: `https://cdn.example.com/${name}.webp`,
  publicId: `products/${productId}/${name}`,
});

let approvedToken: string;
let otherVendorToken: string;
let pendingToken: string;
let customerToken: string;
let approvedVendorId: string;
let otherVendorId: string;
let categoryId: string;
let productId: string;

beforeAll(async () => {
  await cleanDatabase();
  const password = await hashPassword('test1234');
  const [approved, other, pending, customer] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Product Media Vendor',
        email: 'product.media.vendor@example.com',
        password,
        role: 'VENDOR',
        isVerified: true,
        vendorProfile: {
          create: { storeName: 'Product Media Store', status: 'APPROVED' },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: 'Other Media Vendor',
        email: 'product.media.other@example.com',
        password,
        role: 'VENDOR',
        isVerified: true,
        vendorProfile: {
          create: { storeName: 'Other Media Store', status: 'APPROVED' },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: 'Pending Media Vendor',
        email: 'product.media.pending@example.com',
        password,
        role: 'VENDOR',
        isVerified: true,
        vendorProfile: {
          create: { storeName: 'Pending Media Store', status: 'PENDING' },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: 'Media Customer',
        email: 'product.media.customer@example.com',
        password,
        role: 'CUSTOMER',
        isVerified: true,
      },
    }),
  ]);
  approvedVendorId = approved.id;
  otherVendorId = other.id;
  approvedToken = generateTokenPair({
    userId: approved.id,
    email: approved.email,
    role: approved.role,
  }).accessToken;
  otherVendorToken = generateTokenPair({
    userId: other.id,
    email: other.email,
    role: other.role,
  }).accessToken;
  pendingToken = generateTokenPair({
    userId: pending.id,
    email: pending.email,
    role: pending.role,
  }).accessToken;
  customerToken = generateTokenPair({
    userId: customer.id,
    email: customer.email,
    role: customer.role,
  }).accessToken;
  categoryId = (
    await prisma.category.create({
      data: { name: 'Product Media', slug: 'product-media' },
    })
  ).id;
});

beforeEach(async () => {
  mockedUpload.mockReset();
  mockedDelete.mockReset();
  mockedDelete.mockResolvedValue();
  await prisma.product.deleteMany();
  productId = (
    await prisma.product.create({
      data: {
        vendorId: approvedVendorId,
        categoryId,
        name: 'Media Contract Product',
        description: 'Product used to verify secure media lifecycle contracts.',
        basePrice: 25,
        images: ['https://legacy.example.com/original.jpg'],
        media: {
          create: {
            url: 'https://legacy.example.com/original.jpg',
            position: 0,
          },
        },
      },
    })
  ).id;
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('product media upload contract', () => {
  it('requires authentication, an approved vendor, and product ownership', async () => {
    const anonymous = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .attach('images', png(), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(anonymous.status).toBe(401);

    const customer = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(customerToken))
      .attach('images', png(), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(customer.status).toBe(403);

    const pending = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(pendingToken))
      .attach('images', png(), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(pending.status).toBe(403);

    const other = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(otherVendorToken))
      .attach('images', png(), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(other.status).toBe(403);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('uploads in request order, returns stable public IDs, and mirrors legacy URLs', async () => {
    mockedUpload
      .mockResolvedValueOnce(uploadResult(productId, 'second'))
      .mockResolvedValueOnce(uploadResult(productId, 'third'));

    const response = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', jpeg(), {
        filename: 'second.jpg',
        contentType: 'image/jpeg',
      })
      .attach('images', webp(), {
        filename: 'third.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        url: 'https://legacy.example.com/original.jpg',
        position: 0,
      }),
      expect.objectContaining({
        url: expect.stringContaining('second'),
        position: 1,
      }),
      expect.objectContaining({
        url: expect.stringContaining('third'),
        position: 2,
      }),
    ]);
    expect(response.body.data[1].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.body.data[1].publicId).toBeUndefined();
    expect(mockedUpload).toHaveBeenNthCalledWith(
      1,
      expect.any(Buffer),
      `products/${productId}`
    );

    const persisted = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { media: { orderBy: { position: 'asc' } } },
    });
    expect(persisted.images).toEqual(
      response.body.data.map((item: { url: string }) => item.url)
    );
    expect(persisted.media[1]!.publicId).toBe(`products/${productId}/second`);
  });

  it('enforces multipart type, size, field, and count limits', async () => {
    const missing = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken));
    expect(missing.status).toBe(400);

    const invalidType = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', Buffer.from('gif'), {
        filename: 'image.gif',
        contentType: 'image/gif',
      });
    expect(invalidType.status).toBe(400);

    const spoofedType = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', png(), {
        filename: 'spoofed.jpg',
        contentType: 'image/jpeg',
      });
    expect(spoofedType.status).toBe(400);
    expect(spoofedType.body.message).toMatch(/content does not match/i);

    const oversized = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      });
    expect(oversized.status).toBe(413);

    let excess = request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken));
    for (let index = 0; index < 6; index += 1) {
      excess = excess.attach('images', Buffer.from(`${index}`), {
        filename: `${index}.png`,
        contentType: 'image/png',
      });
    }
    const excessResponse = await excess;
    expect(excessResponse.status).toBe(400);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rejects insecure image URLs on legacy JSON product mutations', async () => {
    const response = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', auth(approvedToken))
      .send({ images: ['http://cdn.example.com/insecure.jpg'] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Validation failed',
    });
  });

  it('rolls back completed uploads after a partial provider failure', async () => {
    mockedUpload
      .mockResolvedValueOnce(uploadResult(productId, 'partial'))
      .mockRejectedValueOnce(new Error('provider unavailable'));

    const response = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', png(), {
        filename: 'partial.png',
        contentType: 'image/png',
      })
      .attach('images', png(), {
        filename: 'failed.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith(`products/${productId}/partial`);
    expect(await prisma.productMedia.count({ where: { productId } })).toBe(1);
  });

  it('rolls back every new upload when the image limit is exceeded', async () => {
    await prisma.productMedia.createMany({
      data: [1, 2, 3, 4].map((position) => ({
        productId,
        url: `https://legacy.example.com/${position}.jpg`,
        position,
      })),
    });
    mockedUpload.mockResolvedValueOnce(uploadResult(productId, 'overflow'));

    const response = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', png(), {
        filename: 'overflow.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(mockedDelete).toHaveBeenCalledWith(`products/${productId}/overflow`);
    expect(await prisma.productMedia.count({ where: { productId } })).toBe(5);
  });

  it('serializes concurrent uploads at the five-image boundary', async () => {
    await prisma.productMedia.createMany({
      data: [1, 2, 3].map((position) => ({
        productId,
        url: `https://legacy.example.com/${position}.jpg`,
        position,
      })),
    });
    mockedUpload
      .mockResolvedValueOnce(uploadResult(productId, 'concurrent-a'))
      .mockResolvedValueOnce(uploadResult(productId, 'concurrent-b'));

    const submit = (filename: string) =>
      request(app)
        .post(`/api/v1/products/${productId}/media`)
        .set('Authorization', auth(approvedToken))
        .attach('images', png(), {
          filename,
          contentType: 'image/png',
        });
    const responses = await Promise.all([submit('a.png'), submit('b.png')]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    expect(await prisma.productMedia.count({ where: { productId } })).toBe(5);
    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it('rolls uploads back when database persistence fails', async () => {
    mockedUpload.mockResolvedValueOnce(uploadResult(productId, 'db-rollback'));
    const transaction = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(new Error('simulated DB failure'));

    const response = await request(app)
      .post(`/api/v1/products/${productId}/media`)
      .set('Authorization', auth(approvedToken))
      .attach('images', png(), {
        filename: 'db-rollback.png',
        contentType: 'image/png',
      });
    transaction.mockRestore();

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith(
      `products/${productId}/db-rollback`
    );
    expect(await prisma.productMedia.count({ where: { productId } })).toBe(1);
  });
});

describe('product media replacement and removal contracts', () => {
  it('preserves managed identity when a legacy JSON update retains its URL', async () => {
    const managed = await prisma.productMedia.create({
      data: {
        productId,
        url: 'https://cdn.example.com/retained.webp',
        publicId: `products/${productId}/retained`,
        position: 1,
      },
    });
    const response = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', auth(approvedToken))
      .send({
        name: 'Updated Media Contract Product',
        images: [
          'https://cdn.example.com/retained.webp',
          'https://external.example.com/new.webp',
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.media[0]).toEqual(
      expect.objectContaining({
        id: managed.id,
        url: 'https://cdn.example.com/retained.webp',
        position: 0,
      })
    );
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(
      (
        await prisma.productMedia.findUniqueOrThrow({
          where: { id: managed.id },
        })
      ).publicId
    ).toBe(`products/${productId}/retained`);
  });

  it('replaces content while preserving media identity and position', async () => {
    const existing = await prisma.productMedia.create({
      data: {
        productId,
        url: 'https://cdn.example.com/managed-old.webp',
        publicId: `products/${productId}/managed-old`,
        position: 1,
      },
    });
    mockedUpload.mockResolvedValueOnce(uploadResult(productId, 'managed-new'));

    const response = await request(app)
      .put(`/api/v1/products/${productId}/media/${existing.id}`)
      .set('Authorization', auth(approvedToken))
      .attach('image', png(), {
        filename: 'replacement.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.data[1]).toEqual(
      expect.objectContaining({
        id: existing.id,
        position: 1,
        url: expect.stringContaining('managed-new'),
      })
    );
    expect(response.body.data[1].publicId).toBeUndefined();
    expect(mockedDelete).toHaveBeenCalledWith(
      `products/${productId}/managed-old`
    );
  });

  it('rolls back a replacement when its media ID is missing', async () => {
    mockedUpload.mockResolvedValueOnce(
      uploadResult(productId, 'missing-media')
    );
    const missingId = '00000000-0000-4000-8000-000000000001';

    const response = await request(app)
      .put(`/api/v1/products/${productId}/media/${missingId}`)
      .set('Authorization', auth(approvedToken))
      .attach('image', webp(), {
        filename: 'replacement.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(404);
    expect(mockedDelete).toHaveBeenCalledWith(
      `products/${productId}/missing-media`
    );
  });

  it('removes managed media, mirrors URLs, and treats cleanup as best effort', async () => {
    const managed = await prisma.productMedia.create({
      data: {
        productId,
        url: 'https://cdn.example.com/remove.webp',
        publicId: `products/${productId}/remove`,
        position: 1,
      },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        images: [
          'https://legacy.example.com/original.jpg',
          'https://cdn.example.com/remove.webp',
        ],
      },
    });
    mockedDelete.mockRejectedValueOnce(new Error('cleanup unavailable'));
    const warning = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .delete(`/api/v1/products/${productId}/media/${managed.id}`)
      .set('Authorization', auth(approvedToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].position).toBe(0);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .images
    ).toEqual(['https://legacy.example.com/original.jpg']);
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining(`products/${productId}/remove`),
      expect.objectContaining({ context: 'product media removal' })
    );
    warning.mockRestore();
  });

  it('does not expose or mutate another product through a media ID', async () => {
    const otherProduct = await prisma.product.create({
      data: {
        vendorId: otherVendorId,
        categoryId,
        name: 'Other Vendor Media',
        description: 'Other vendor product for media ownership checks.',
        basePrice: 10,
        media: {
          create: {
            url: 'https://cdn.example.com/other.webp',
            publicId: 'products/other/managed',
            position: 0,
          },
        },
        images: ['https://cdn.example.com/other.webp'],
      },
      include: { media: true },
    });

    const response = await request(app)
      .delete(
        `/api/v1/products/${productId}/media/${otherProduct.media[0]!.id}`
      )
      .set('Authorization', auth(approvedToken));
    expect(response.status).toBe(404);
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});

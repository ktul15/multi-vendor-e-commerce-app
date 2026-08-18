import bcrypt from 'bcrypt';
import request from 'supertest';

jest.mock('../../src/utils/cloudinaryUpload', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}));

import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { cleanDatabase } from '../../src/__tests__/setup';
import { deleteImage, uploadImage } from '../../src/utils/cloudinaryUpload';
import { logger } from '../../src/utils/logger';
import { Prisma } from '../../src/generated/prisma/client';
import { env } from '../../src/config/env';
import { reconcileCategoryMedia } from '../../src/scripts/reconcile-category-media';

const mockedUpload = uploadImage as jest.MockedFunction<typeof uploadImage>;
const mockedDelete = deleteImage as jest.MockedFunction<typeof deleteImage>;
let adminToken: string;
let vendorId: string;
const png = (marker: string) =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(marker),
  ]);

beforeAll(async () => {
  await cleanDatabase();
  const password = await bcrypt.hash('test1234', 10);
  const [admin, vendor] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Category Admin',
        email: 'category.contract.admin@example.com',
        password,
        role: 'ADMIN',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Category Vendor',
        email: 'category.contract.vendor@example.com',
        password,
        role: 'VENDOR',
        isVerified: true,
      },
    }),
  ]);
  vendorId = vendor.id;
  const login = await request(app).post('/api/v1/auth/login').send({
    email: admin.email,
    password: 'test1234',
  });
  adminToken = `Bearer ${login.body.data.tokens.accessToken}`;
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

const createCategory = async (name: string, parentId?: string) => {
  const response = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', adminToken)
    .send({ name, ...(parentId && { parentId }) });
  expect(response.status).toBe(201);
  return response.body.data as { id: string };
};

describe('category hierarchy contract', () => {
  it('returns the complete recursive tree beyond three levels', async () => {
    const root = await createCategory('Recursive Root');
    const level2 = await createCategory('Recursive Level Two', root.id);
    const level3 = await createCategory('Recursive Level Three', level2.id);
    const level4 = await createCategory('Recursive Level Four', level3.id);

    const response = await request(app).get('/api/v1/categories');
    expect(response.status).toBe(200);
    const treeRoot = response.body.data.find(
      (category: { id: string }) => category.id === root.id
    );
    expect(treeRoot.children[0].children[0].children[0].id).toBe(level4.id);
  });

  it('rejects moves beneath descendants and empty updates', async () => {
    const root = await createCategory('Cycle Root');
    const child = await createCategory('Cycle Child', root.id);
    const grandchild = await createCategory('Cycle Grandchild', child.id);

    const cycle = await request(app)
      .put(`/api/v1/categories/${root.id}`)
      .set('Authorization', adminToken)
      .send({ parentId: grandchild.id });
    expect(cycle.status).toBe(400);
    expect(cycle.body.message).toMatch(/descendants/i);

    const noOp = await request(app)
      .put(`/api/v1/categories/${root.id}`)
      .set('Authorization', adminToken)
      .send({});
    expect(noOp.status).toBe(400);
    expect(noOp.body.message).toMatch(/at least one/i);
  });

  it('serializes concurrent moves so they cannot create a cycle', async () => {
    const first = await createCategory('Concurrent Cycle First');
    const second = await createCategory('Concurrent Cycle Second');

    const responses = await Promise.all([
      request(app)
        .put(`/api/v1/categories/${first.id}`)
        .set('Authorization', adminToken)
        .send({ parentId: second.id }),
      request(app)
        .put(`/api/v1/categories/${second.id}`)
        .set('Authorization', adminToken)
        .send({ parentId: first.id }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 400,
    ]);
    const stored = await prisma.category.findMany({
      where: { id: { in: [first.id, second.id] } },
      select: { id: true, parentId: true },
    });
    const parents = new Map(
      stored.map((category) => [category.id, category.parentId])
    );
    expect(
      parents.get(first.id) === second.id && parents.get(second.id) === first.id
    ).toBe(false);
  });

  it('detects a legacy cycle instead of silently omitting its categories', async () => {
    const first = await createCategory('Legacy Cycle First');
    const second = await createCategory('Legacy Cycle Second', first.id);
    await prisma.category.update({
      where: { id: first.id },
      data: { parentId: second.id },
    });

    try {
      const response = await request(app).get('/api/v1/categories');
      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(/hierarchy contains a cycle/i);
    } finally {
      await prisma.category.update({
        where: { id: first.id },
        data: { parentId: null },
      });
    }
  });

  it('allocates unique slugs for concurrent same-name creates', async () => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/v1/categories')
          .set('Authorization', adminToken)
          .send({ name: 'Concurrent Slug' })
      )
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(
      new Set(responses.map((response) => response.body.data.slug)).size
    ).toBe(3);
  });
});

describe('category media lifecycle contract', () => {
  it('keeps category images optional', async () => {
    const response = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', adminToken)
      .send({ name: 'Image Optional Category' });
    expect(response.status).toBe(201);
    expect(response.body.data.image).toBeNull();
  });

  it('persists upload identity and cleans replaced and deleted images', async () => {
    mockedUpload
      .mockResolvedValueOnce({
        url: 'https://cdn.example.com/categories/old.png',
        publicId: 'categories/old',
      })
      .mockResolvedValueOnce({
        url: 'https://cdn.example.com/categories/new.png',
        publicId: 'categories/new',
      });

    const created = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', adminToken)
      .field('name', 'Media Category')
      .attach('image', png('old-image'), {
        filename: 'old.png',
        contentType: 'image/png',
      });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/api/v1/categories/${created.body.data.id}`)
      .set('Authorization', adminToken)
      .attach('image', png('new-image'), {
        filename: 'new.png',
        contentType: 'image/png',
      });
    expect(updated.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith('categories/old');
    expect(
      await prisma.category.findUnique({
        where: { id: created.body.data.id },
        select: { imagePublicId: true },
      })
    ).toEqual({ imagePublicId: 'categories/new' });

    const deleted = await request(app)
      .delete(`/api/v1/categories/${created.body.data.id}`)
      .set('Authorization', adminToken);
    expect(deleted.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith('categories/new');
  });

  it('rolls back a new upload when the database update fails', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Rollback Media Category',
        slug: 'rollback-media-category',
        image: 'https://cdn.example.com/categories/original.png',
        imagePublicId: 'categories/original',
      },
    });
    mockedUpload.mockResolvedValue({
      url: 'https://cdn.example.com/categories/rollback.png',
      publicId: 'categories/rollback',
    });
    const transaction = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(new Error('simulated database failure'));

    const response = await request(app)
      .put(`/api/v1/categories/${category.id}`)
      .set('Authorization', adminToken)
      .attach('image', png('rollback-image'), {
        filename: 'rollback.png',
        contentType: 'image/png',
      });
    transaction.mockRestore();

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith('categories/rollback');
    expect(
      await prisma.category.findUnique({
        where: { id: category.id },
        select: { imagePublicId: true },
      })
    ).toEqual({ imagePublicId: 'categories/original' });
  });

  it('logs an upload-cleanup failure during transaction rollback', async () => {
    mockedUpload.mockResolvedValue({
      url: 'https://cdn.example.com/categories/create-rollback.png',
      publicId: 'categories/create-rollback',
    });
    mockedDelete.mockRejectedValueOnce(new Error('cleanup unavailable'));
    const transaction = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(new Error('simulated create failure'));
    const warning = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', adminToken)
      .field('name', 'Create Rollback Cleanup')
      .attach('image', png('create-rollback'), {
        filename: 'create-rollback.png',
        contentType: 'image/png',
      });
    transaction.mockRestore();

    expect(response.status).toBe(500);
    expect(mockedDelete).toHaveBeenCalledWith('categories/create-rollback');
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('rolled back image categories/create-rollback'),
      expect.objectContaining({ error: 'cleanup unavailable' })
    );
    warning.mockRestore();
  });

  it('keeps a committed update successful when old-image cleanup fails', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Cleanup Warning Category',
        slug: 'cleanup-warning-category',
        image: 'https://cdn.example.com/categories/stale.png',
        imagePublicId: 'categories/stale',
      },
    });
    mockedUpload.mockResolvedValue({
      url: 'https://cdn.example.com/categories/committed.png',
      publicId: 'categories/committed',
    });
    mockedDelete.mockRejectedValueOnce(new Error('simulated cleanup failure'));

    const response = await request(app)
      .put(`/api/v1/categories/${category.id}`)
      .set('Authorization', adminToken)
      .attach('image', png('committed-image'), {
        filename: 'committed.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.image).toContain('committed.png');
  });

  it('reconciles only legacy images owned by the configured cloud', async () => {
    const cloudName = jest.replaceProperty(
      env,
      'CLOUDINARY_CLOUD_NAME',
      'issue-131-owned-cloud'
    );
    const [owned, foreign] = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Legacy Owned Media',
          slug: 'legacy-owned-media',
          image:
            'https://res.cloudinary.com/issue-131-owned-cloud/image/upload/v123/categories/shared-id.png',
          imagePublicId: null,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Legacy Foreign Media',
          slug: 'legacy-foreign-media',
          image:
            'https://res.cloudinary.com/another-cloud/image/upload/v123/categories/shared-id.png',
          imagePublicId: null,
        },
      }),
    ]);

    try {
      const ownedResponse = await request(app)
        .put(`/api/v1/categories/${owned.id}`)
        .set('Authorization', adminToken)
        .send({ image: 'https://example.com/owned-replacement.png' });
      expect(ownedResponse.status).toBe(200);
      expect(mockedDelete).toHaveBeenCalledWith('categories/shared-id');

      mockedDelete.mockClear();
      const foreignResponse = await request(app)
        .put(`/api/v1/categories/${foreign.id}`)
        .set('Authorization', adminToken)
        .send({ image: 'https://example.com/foreign-replacement.png' });
      expect(foreignResponse.status).toBe(200);
      expect(mockedDelete).not.toHaveBeenCalled();
    } finally {
      cloudName.restore();
    }
  });

  it('does not persist stale ownership after a concurrent image change', async () => {
    const cloudName = jest.replaceProperty(
      env,
      'CLOUDINARY_CLOUD_NAME',
      'issue-131-owned-cloud'
    );
    const category = await prisma.category.create({
      data: {
        name: 'Concurrent Reconciliation',
        slug: 'concurrent-reconciliation',
        image:
          'https://res.cloudinary.com/issue-131-owned-cloud/image/upload/v123/categories/stale-source.png',
        imagePublicId: null,
      },
    });
    const originalUpdateMany = prisma.category.updateMany.bind(prisma.category);
    const updateMany = jest
      .spyOn(prisma.category, 'updateMany')
      .mockImplementationOnce((async (args) => {
        await prisma.category.update({
          where: { id: category.id },
          data: { image: 'https://example.com/concurrent-replacement.png' },
        });
        return originalUpdateMany(args);
      }) as typeof prisma.category.updateMany);

    try {
      const summary = await reconcileCategoryMedia(true);
      const stored = await prisma.category.findUniqueOrThrow({
        where: { id: category.id },
        select: { image: true, imagePublicId: true },
      });

      expect(summary.concurrentlyChanged).toBe(1);
      expect(summary.reconciled).toBe(0);
      expect(stored).toEqual({
        image: 'https://example.com/concurrent-replacement.png',
        imagePublicId: null,
      });
    } finally {
      updateMany.mockRestore();
      cloudName.restore();
    }
  });

  it('serializes concurrent replacements and cleans every predecessor', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Concurrent Media',
        slug: 'concurrent-media',
        image: 'https://cdn.example.com/categories/original.png',
        imagePublicId: 'categories/concurrent-original',
      },
    });
    mockedUpload
      .mockResolvedValueOnce({
        url: 'https://cdn.example.com/categories/concurrent-a.png',
        publicId: 'categories/concurrent-a',
      })
      .mockResolvedValueOnce({
        url: 'https://cdn.example.com/categories/concurrent-b.png',
        publicId: 'categories/concurrent-b',
      });

    const responses = await Promise.all([
      request(app)
        .put(`/api/v1/categories/${category.id}`)
        .set('Authorization', adminToken)
        .attach('image', png('concurrent-a'), {
          filename: 'concurrent-a.png',
          contentType: 'image/png',
        }),
      request(app)
        .put(`/api/v1/categories/${category.id}`)
        .set('Authorization', adminToken)
        .attach('image', png('concurrent-b'), {
          filename: 'concurrent-b.png',
          contentType: 'image/png',
        }),
    ]);
    expect(responses.every((response) => response.status === 200)).toBe(true);

    const stored = await prisma.category.findUniqueOrThrow({
      where: { id: category.id },
      select: { imagePublicId: true },
    });
    const nonFinal = [
      'categories/concurrent-a',
      'categories/concurrent-b',
    ].find((publicId) => publicId !== stored.imagePublicId)!;
    expect(mockedDelete).toHaveBeenCalledWith('categories/concurrent-original');
    expect(mockedDelete).toHaveBeenCalledWith(nonFinal);
    expect(mockedDelete).not.toHaveBeenCalledWith(stored.imagePublicId!);
  });

  it('cleans all managed assets during a concurrent update and delete', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Update Delete Media',
        slug: 'update-delete-media',
        image: 'https://cdn.example.com/categories/update-delete-old.png',
        imagePublicId: 'categories/update-delete-old',
      },
    });
    mockedUpload.mockResolvedValue({
      url: 'https://cdn.example.com/categories/update-delete-new.png',
      publicId: 'categories/update-delete-new',
    });

    const [update, deletion] = await Promise.all([
      request(app)
        .put(`/api/v1/categories/${category.id}`)
        .set('Authorization', adminToken)
        .attach('image', png('update-delete-new'), {
          filename: 'update-delete-new.png',
          contentType: 'image/png',
        }),
      request(app)
        .delete(`/api/v1/categories/${category.id}`)
        .set('Authorization', adminToken),
    ]);

    expect(deletion.status).toBe(200);
    expect([200, 404]).toContain(update.status);
    expect(mockedDelete).toHaveBeenCalledWith('categories/update-delete-old');
    expect(mockedDelete).toHaveBeenCalledWith('categories/update-delete-new');
    expect(
      await prisma.category.findUnique({ where: { id: category.id } })
    ).toBeNull();
  });

  it('keeps delete successful when committed image cleanup fails', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Delete Cleanup Warning',
        slug: 'delete-cleanup-warning',
        image: 'https://cdn.example.com/categories/delete-warning.png',
        imagePublicId: 'categories/delete-warning',
      },
    });
    mockedDelete.mockRejectedValueOnce(new Error('delete cleanup unavailable'));

    const response = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set('Authorization', adminToken);

    expect(response.status).toBe(200);
    expect(
      await prisma.category.findUnique({ where: { id: category.id } })
    ).toBeNull();
  });
});

describe('category deletion dependencies', () => {
  it('preserves 400 errors for categories with children or products', async () => {
    const parent = await createCategory('Dependency Parent');
    await createCategory('Dependency Child', parent.id);
    const childDependency = await request(app)
      .delete(`/api/v1/categories/${parent.id}`)
      .set('Authorization', adminToken);
    expect(childDependency.status).toBe(400);
    expect(childDependency.body.message).toMatch(/subcategories/i);

    const productCategory = await createCategory('Product Dependency');
    await prisma.product.create({
      data: {
        vendorId,
        categoryId: productCategory.id,
        name: 'Dependent Product',
        description: 'Product used to retain a category dependency.',
        basePrice: 10,
        variants: {
          create: { sku: 'CATEGORY-CONTRACT-SKU', price: 10, stock: 1 },
        },
      },
    });
    const productDependency = await request(app)
      .delete(`/api/v1/categories/${productCategory.id}`)
      .set('Authorization', adminToken);
    expect(productDependency.status).toBe(400);
    expect(productDependency.body.message).toMatch(/attached products/i);
  });

  it('maps a concurrent foreign-key delete failure to the stable 400 contract', async () => {
    const category = await createCategory('Concurrent FK Dependency');
    const transaction = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('simulated FK race', {
          code: 'P2003',
          clientVersion: 'test',
        })
      );

    const response = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set('Authorization', adminToken);
    transaction.mockRestore();

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/dependencies/i);
  });
});

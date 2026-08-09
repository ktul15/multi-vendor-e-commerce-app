import { prisma } from '../../config/prisma';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../../utils/apiError';
import {
  CreateProductInput,
  UpdateProductInput,
  AddVariantInput,
  UpdateVariantInput,
  EditProductInput,
  GetProductQueryInput,
  VendorInventoryQueryInput,
} from './product.validation';
import { Prisma, VendorProfileStatus } from '../../generated/prisma/client';
import { uploadImage, UploadResult } from '../../utils/cloudinaryUpload';
import { cleanupMediaBestEffort } from '../../utils/mediaCleanup';

const MAX_PRODUCT_MEDIA = 5;
const PRODUCT_MEDIA_FOLDER = 'products';
const productMediaPublicSelect = {
  id: true,
  url: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductMediaSelect;

const skuConflict = (field = 'sku') =>
  ApiError.conflict('SKU is already in use by another variant', [
    { field, message: 'SKU must be unique' },
  ]);

const isPrismaError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export class ProductService {
  private async lockProduct(
    tx: Prisma.TransactionClient,
    productId: string
  ): Promise<{ id: string; vendorId: string } | undefined> {
    const rows = await tx.$queryRaw<Array<{ id: string; vendorId: string }>>`
      SELECT "id", "vendorId" FROM "products"
      WHERE "id" = ${productId}
      FOR UPDATE
    `;
    return rows[0];
  }

  private async assertVendorApprovedInTransaction(
    tx: Prisma.TransactionClient,
    vendorId: string
  ): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ status: VendorProfileStatus }>>`
      SELECT "status" FROM "vendor_profiles"
      WHERE "userId" = ${vendorId}
      FOR SHARE
    `;
    if (rows[0]?.status !== VendorProfileStatus.APPROVED) {
      throw ApiError.forbidden(
        'Your vendor account must be approved before you can manage products.'
      );
    }
  }

  private assertProductOwner(
    product: { vendorId: string } | null | undefined,
    vendorId: string
  ): void {
    if (!product) throw ApiError.notFound('Product not found');
    if (product.vendorId !== vendorId) {
      throw ApiError.forbidden(
        'You do not have permission to modify this product'
      );
    }
  }

  private validateUploadResult(upload: UploadResult): void {
    let url: URL;
    try {
      url = new URL(upload.url);
    } catch {
      throw ApiError.internal('Media provider returned an invalid image URL');
    }
    if (url.protocol !== 'https:' || !upload.publicId.trim()) {
      throw ApiError.internal('Media provider returned invalid image metadata');
    }
  }

  private validateFileContents(file: Express.Multer.File): void {
    const bytes = file.buffer;
    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    const isPng =
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp =
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    const matchesMime =
      (file.mimetype === 'image/jpeg' && isJpeg) ||
      (file.mimetype === 'image/png' && isPng) ||
      (file.mimetype === 'image/webp' && isWebp);
    if (!matchesMime) {
      throw ApiError.badRequest(
        'Image content does not match its declared JPEG, PNG, or WebP type'
      );
    }
  }

  private async cleanupUploads(
    uploads: UploadResult[],
    context: string
  ): Promise<void> {
    await Promise.all(
      uploads.map((upload) => cleanupMediaBestEffort(upload.publicId, context))
    );
  }

  private async syncLegacyImages(
    tx: Prisma.TransactionClient,
    productId: string
  ) {
    const media = await tx.productMedia.findMany({
      where: { productId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: productMediaPublicSelect,
    });
    await tx.product.update({
      where: { id: productId },
      data: { images: media.map((item) => item.url) },
    });
    return media;
  }

  private async assertVendorApproved(vendorId: string): Promise<void> {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: vendorId },
      select: { status: true },
    });
    if (!profile || profile.status !== VendorProfileStatus.APPROVED) {
      throw ApiError.forbidden(
        'Your vendor account must be approved before you can manage products.'
      );
    }
  }

  /**
   * Get products with pagination, sorting, search and filtering.
   */
  async getProducts(query: GetProductQueryInput) {
    const {
      page,
      limit,
      sort,
      search,
      categoryId,
      vendorId,
      minPrice,
      maxPrice,
      rating,
      inStock,
    } = query;
    const skip = (page - 1) * limit;

    // Build Where Clause
    const where: Prisma.ProductWhereInput = {
      isActive: true, // Only show active items to public
      ...(categoryId && { categoryId }),
      ...(vendorId && { vendorId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        basePrice: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(rating !== undefined && { avgRating: { gte: rating } }),
      ...(inStock !== undefined && {
        variants: inStock
          ? { some: { stock: { gt: 0 } } }
          : { every: { stock: { lte: 0 } } },
      }),
    };

    // Build Order By
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { basePrice: 'asc' };
    if (sort === 'price_desc') orderBy = { basePrice: 'desc' };
    if (sort === 'rating') orderBy = { avgRating: 'desc' };
    if (sort === 'popular') orderBy = { reviewCount: 'desc' };

    // Run count and data fetch concurrently
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          variants: true,
          media: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: productMediaPublicSelect,
          },
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * List the authenticated vendor's complete inventory, including inactive products.
   * Vendor identity is always derived from the authenticated session.
   */
  async getVendorInventory(vendorId: string, query: VendorInventoryQueryInput) {
    await this.assertVendorApproved(vendorId);
    const {
      page,
      limit,
      search,
      categoryId,
      isActive,
      inStock,
      sortBy,
      sortOrder,
    } = query;
    const where: Prisma.ProductWhereInput = {
      vendorId,
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(inStock !== undefined && {
        variants: inStock
          ? { some: { stock: { gt: 0 } } }
          : { none: { stock: { gt: 0 } } },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            variants: {
              some: { sku: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      }),
    };
    const orderBy = {
      [sortBy]: sortOrder,
    } as Prisma.ProductOrderByWithRelationInput;
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          variants: true,
          media: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: productMediaPublicSelect,
          },
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** Return an owned product for editing, including inactive listings. */
  async getVendorProductById(id: string, vendorId: string) {
    await this.assertVendorApproved(vendorId);
    const product = await prisma.product.findFirst({
      where: { id, vendorId },
      include: {
        variants: true,
        media: {
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: productMediaPublicSelect,
        },
      },
    });
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  }

  /**
   * Get a specific product by ID, including its variants.
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        media: {
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: productMediaPublicSelect,
        },
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, parentId: true } },
      },
    });

    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product not found');
    }

    return product;
  }

  /**
   * Create a product. Vendor ID is pulled from the authenticated token.
   */
  async createProduct(vendorId: string, data: CreateProductInput) {
    await this.assertVendorApproved(vendorId);
    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    try {
      return await prisma.product.create({
        data: {
          vendorId,
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          images: data.images,
          isActive: data.isActive,
          tags: data.tags,
          media: {
            create: data.images.map((url, position) => ({ url, position })),
          },
          variants: {
            create: data.variants,
          },
        },
        include: {
          variants: true,
          media: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: productMediaPublicSelect,
          },
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw skuConflict('variants');
      throw error;
    }
  }

  /**
   * Update an existing product. Only the owner VENDOR can update it.
   */
  async updateProduct(id: string, vendorId: string, data: UpdateProductInput) {
    await this.assertVendorApproved(vendorId);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw ApiError.forbidden(
        'You do not have permission to update this product'
      );
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new ApiError(404, 'Category not found');
      }
    }

    const { images, ...productData } = data;
    if (images === undefined) {
      return prisma.product.update({
        where: { id },
        data: productData,
        include: {
          media: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: productMediaPublicSelect,
          },
        },
      });
    }

    let removedPublicIds: string[] = [];
    const updated = await prisma.$transaction(async (tx) => {
      await this.assertVendorApprovedInTransaction(tx, vendorId);
      this.assertProductOwner(await this.lockProduct(tx, id), vendorId);
      const existingMedia = await tx.productMedia.findMany({
        where: { productId: id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          url: true,
          publicId: true,
          createdAt: true,
        },
      });
      const availableByUrl = new Map<string, typeof existingMedia>();
      for (const item of existingMedia) {
        const matches = availableByUrl.get(item.url) ?? [];
        matches.push(item);
        availableByUrl.set(item.url, matches);
      }
      const desiredMedia = images.map((url) => {
        const matches = availableByUrl.get(url);
        return { url, existing: matches?.shift() };
      });
      const retainedIds = new Set(
        desiredMedia.flatMap((item) =>
          item.existing ? [item.existing.id] : []
        )
      );
      removedPublicIds = existingMedia.flatMap((item) =>
        item.publicId && !retainedIds.has(item.id) ? [item.publicId] : []
      );
      await tx.productMedia.deleteMany({ where: { productId: id } });
      for (const [position, item] of desiredMedia.entries()) {
        await tx.productMedia.create({
          data: {
            ...(item.existing && {
              id: item.existing.id,
              publicId: item.existing.publicId,
              createdAt: item.existing.createdAt,
            }),
            productId: id,
            url: item.url,
            position,
          },
        });
      }
      return tx.product.update({
        where: { id },
        data: { ...productData, images },
        include: {
          media: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: productMediaPublicSelect,
          },
        },
      });
    });
    await Promise.all(
      removedPublicIds.map((publicId) =>
        cleanupMediaBestEffort(publicId, 'product JSON media replacement')
      )
    );
    return updated;
  }

  /** Atomically reconcile all editable product, media, variant, and inventory fields. */
  async editProduct(id: string, vendorId: string, data: EditProductInput) {
    let removedPublicIds: string[] = [];
    try {
      const edited = await prisma.$transaction(async (tx) => {
        await this.assertVendorApprovedInTransaction(tx, vendorId);
        this.assertProductOwner(await this.lockProduct(tx, id), vendorId);
        if (
          !(await tx.category.findUnique({ where: { id: data.categoryId } }))
        ) {
          throw ApiError.notFound('Category not found');
        }

        const existingMedia = await tx.productMedia.findMany({
          where: { productId: id },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: { id: true, url: true, publicId: true, createdAt: true },
        });
        const availableByUrl = new Map<string, typeof existingMedia>();
        for (const item of existingMedia) {
          const matches = availableByUrl.get(item.url) ?? [];
          matches.push(item);
          availableByUrl.set(item.url, matches);
        }
        const desiredMedia = data.images.map((url) => ({
          url,
          existing: availableByUrl.get(url)?.shift(),
        }));
        const retainedMediaIds = new Set(
          desiredMedia.flatMap((item) =>
            item.existing ? [item.existing.id] : []
          )
        );
        removedPublicIds = existingMedia.flatMap((item) =>
          item.publicId && !retainedMediaIds.has(item.id) ? [item.publicId] : []
        );
        await tx.productMedia.deleteMany({ where: { productId: id } });
        for (const [position, item] of desiredMedia.entries()) {
          await tx.productMedia.create({
            data: {
              ...(item.existing && {
                id: item.existing.id,
                publicId: item.existing.publicId,
                createdAt: item.existing.createdAt,
              }),
              productId: id,
              url: item.url,
              position,
            },
          });
        }

        const existingVariants = await tx.variant.findMany({
          where: { productId: id },
          select: { id: true },
        });
        const existingIds = new Set(
          existingVariants.map((variant) => variant.id)
        );
        const retainedIds = new Set(
          data.variants.flatMap((variant) => (variant.id ? [variant.id] : []))
        );
        if ([...retainedIds].some((variantId) => !existingIds.has(variantId))) {
          throw ApiError.notFound('Variant not found for this product');
        }

        // Free retained SKU values first so swaps and reuse from removed variants work.
        for (const variantId of retainedIds) {
          await tx.variant.update({
            where: { id: variantId },
            data: { sku: `__product_edit_${randomUUID()}` },
          });
        }
        await tx.variant.deleteMany({
          where: { productId: id, id: { notIn: [...retainedIds] } },
        });
        for (const variant of data.variants) {
          const { id: variantId, ...values } = variant;
          if (variantId) {
            await tx.variant.update({ where: { id: variantId }, data: values });
          } else {
            await tx.variant.create({ data: { ...values, productId: id } });
          }
        }
        await tx.product.update({
          where: { id },
          data: {
            categoryId: data.categoryId,
            name: data.name,
            description: data.description,
            basePrice: data.basePrice,
            images: data.images,
            isActive: data.isActive,
            tags: data.tags,
          },
        });
        return tx.product.findUniqueOrThrow({
          where: { id },
          include: {
            variants: true,
            media: {
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
              select: productMediaPublicSelect,
            },
          },
        });
      });
      await Promise.all(
        removedPublicIds.map((publicId) =>
          cleanupMediaBestEffort(publicId, 'atomic product edit')
        )
      );
      return edited;
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw skuConflict('variants');
      if (isPrismaError(error, 'P2003')) {
        throw ApiError.conflict(
          'Variant cannot be deleted because it has order history'
        );
      }
      throw error;
    }
  }

  async uploadProductMedia(
    productId: string,
    vendorId: string,
    files: Express.Multer.File[]
  ) {
    await this.assertVendorApproved(vendorId);
    if (files.length === 0) {
      throw ApiError.badRequest('At least one image is required');
    }
    files.forEach((file) => this.validateFileContents(file));
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });
    this.assertProductOwner(product, vendorId);

    const uploads: UploadResult[] = [];
    try {
      for (const file of files) {
        const uploaded = await uploadImage(
          file.buffer,
          `${PRODUCT_MEDIA_FOLDER}/${productId}`
        );
        uploads.push(uploaded);
        this.validateUploadResult(uploaded);
      }
    } catch (error) {
      await this.cleanupUploads(
        uploads,
        'product media partial upload rollback'
      );
      throw error;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        await this.assertVendorApprovedInTransaction(tx, vendorId);
        this.assertProductOwner(
          await this.lockProduct(tx, productId),
          vendorId
        );
        const aggregate = await tx.productMedia.aggregate({
          where: { productId },
          _count: true,
          _max: { position: true },
        });
        if (aggregate._count + uploads.length > MAX_PRODUCT_MEDIA) {
          throw ApiError.badRequest(
            `Maximum ${MAX_PRODUCT_MEDIA} product images allowed`
          );
        }
        const startPosition = (aggregate._max.position ?? -1) + 1;
        await tx.productMedia.createMany({
          data: uploads.map((upload, index) => ({
            productId,
            url: upload.url,
            publicId: upload.publicId,
            position: startPosition + index,
          })),
        });
        return this.syncLegacyImages(tx, productId);
      });
    } catch (error) {
      await this.cleanupUploads(uploads, 'product media database rollback');
      throw error;
    }
  }

  async replaceProductMedia(
    productId: string,
    mediaId: string,
    vendorId: string,
    file: Express.Multer.File
  ) {
    await this.assertVendorApproved(vendorId);
    this.validateFileContents(file);
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });
    this.assertProductOwner(product, vendorId);

    const uploaded = await uploadImage(
      file.buffer,
      `${PRODUCT_MEDIA_FOLDER}/${productId}`
    );
    try {
      this.validateUploadResult(uploaded);
    } catch (error) {
      await cleanupMediaBestEffort(
        uploaded.publicId,
        'product media invalid-provider rollback'
      );
      throw error;
    }

    let replacedPublicId: string | null = null;
    try {
      const media = await prisma.$transaction(async (tx) => {
        await this.assertVendorApprovedInTransaction(tx, vendorId);
        this.assertProductOwner(
          await this.lockProduct(tx, productId),
          vendorId
        );
        const existing = await tx.productMedia.findFirst({
          where: { id: mediaId, productId },
          select: { publicId: true },
        });
        if (!existing) throw ApiError.notFound('Product media not found');
        replacedPublicId = existing.publicId;
        await tx.productMedia.update({
          where: { id: mediaId },
          data: { url: uploaded.url, publicId: uploaded.publicId },
        });
        return this.syncLegacyImages(tx, productId);
      });
      if (replacedPublicId) {
        await cleanupMediaBestEffort(
          replacedPublicId,
          'product media replacement'
        );
      }
      return media;
    } catch (error) {
      await cleanupMediaBestEffort(
        uploaded.publicId,
        'product media replacement rollback'
      );
      throw error;
    }
  }

  async removeProductMedia(
    productId: string,
    mediaId: string,
    vendorId: string
  ) {
    await this.assertVendorApproved(vendorId);
    let removedPublicId: string | null = null;
    const media = await prisma.$transaction(async (tx) => {
      await this.assertVendorApprovedInTransaction(tx, vendorId);
      this.assertProductOwner(await this.lockProduct(tx, productId), vendorId);
      const existing = await tx.productMedia.findFirst({
        where: { id: mediaId, productId },
        select: { publicId: true },
      });
      if (!existing) throw ApiError.notFound('Product media not found');
      removedPublicId = existing.publicId;
      await tx.productMedia.delete({ where: { id: mediaId } });
      return this.syncLegacyImages(tx, productId);
    });
    if (removedPublicId) {
      await cleanupMediaBestEffort(removedPublicId, 'product media removal');
    }
    return media;
  }

  /**
   * Delete a product. Only owner VENDOR can delete it.
   */
  async deleteProduct(id: string, vendorId: string) {
    await this.assertVendorApproved(vendorId);
    let publicIds: string[] = [];
    try {
      await prisma.$transaction(async (tx) => {
        await this.assertVendorApprovedInTransaction(tx, vendorId);
        this.assertProductOwner(await this.lockProduct(tx, id), vendorId);
        publicIds = (
          await tx.productMedia.findMany({
            where: { productId: id, publicId: { not: null } },
            select: { publicId: true },
          })
        ).flatMap((item) => (item.publicId ? [item.publicId] : []));
        await tx.product.delete({ where: { id } });
      });
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw ApiError.conflict(
          'Product cannot be deleted because it has order history'
        );
      }
      throw error;
    }
    await Promise.all(
      publicIds.map((publicId) =>
        cleanupMediaBestEffort(publicId, 'product deletion')
      )
    );
  }

  /**
   * Add a variant to a product. Only owner VENDOR.
   */
  async addVariant(productId: string, vendorId: string, data: AddVariantInput) {
    await this.assertVendorApproved(vendorId);
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw ApiError.forbidden(
        'You do not have permission to modify this product'
      );
    }

    try {
      return await prisma.variant.create({
        data: {
          ...data,
          productId,
        },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw skuConflict();
      throw error;
    }
  }

  /**
   * Update a specific variant. Only owner VENDOR.
   */
  async updateVariant(
    productId: string,
    variantId: string,
    vendorId: string,
    data: UpdateVariantInput
  ) {
    await this.assertVendorApproved(vendorId);
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw ApiError.forbidden(
        'You do not have permission to modify this product'
      );
    }

    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant || variant.productId !== productId) {
      throw new ApiError(404, 'Variant not found for this product');
    }

    try {
      return await prisma.variant.update({
        where: { id: variantId },
        data,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw skuConflict();
      throw error;
    }
  }

  /**
   * Delete an unreferenced persisted variant. Order history uses a restrictive
   * foreign key, so referenced variants remain immutable historical records.
   */
  async deleteVariant(productId: string, variantId: string, vendorId: string) {
    await this.assertVendorApproved(vendorId);
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw ApiError.notFound('Product not found');
    if (product.vendorId !== vendorId) {
      throw ApiError.forbidden(
        'You do not have permission to modify this product'
      );
    }

    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
    });
    if (!variant || variant.productId !== productId) {
      throw ApiError.notFound('Variant not found for this product');
    }

    try {
      await prisma.variant.delete({ where: { id: variantId } });
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw ApiError.conflict(
          'Variant cannot be deleted because it has order history'
        );
      }
      throw error;
    }
  }
}

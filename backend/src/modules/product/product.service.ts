import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import {
  CreateProductInput,
  UpdateProductInput,
  AddVariantInput,
  UpdateVariantInput,
  GetProductQueryInput,
  VendorInventoryQueryInput,
} from './product.validation';
import { Prisma, VendorProfileStatus } from '../../generated/prisma/client';

const skuConflict = (field = 'sku') =>
  ApiError.conflict('SKU is already in use by another variant', [
    { field, message: 'SKU must be unique' },
  ]);

const isPrismaError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export class ProductService {
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
   * Get a specific product by ID, including its variants.
   */
  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
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
          variants: {
            create: data.variants,
          },
        },
        include: {
          variants: true,
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

    return prisma.product.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a product. Only owner VENDOR can delete it.
   */
  async deleteProduct(id: string, vendorId: string) {
    await this.assertVendorApproved(vendorId);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.vendorId !== vendorId) {
      throw ApiError.forbidden(
        'You do not have permission to delete this product'
      );
    }

    // Deleting the product will automatically delete variants due to onDelete: Cascade in Prisma schema
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw ApiError.conflict(
          'Product cannot be deleted because it has order history'
        );
      }
      throw error;
    }
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

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { CreateProductInput, UpdateProductInput, AddVariantInput, UpdateVariantInput } from './product.validation';

export class ProductService {
    /**
     * Get products with optional vendor/category filtering.
     * Can be easily extended for pagination/sorting (Issue #21).
     */
    async getProducts(filters: { vendorId?: string; categoryId?: string } = {}) {
        return prisma.product.findMany({
            where: {
                ...filters,
                isActive: true, // Typically customers only see active products
            },
            include: {
                variants: true,
                vendor: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
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

        if (!product) {
            throw new ApiError(404, 'Product not found');
        }

        return product;
    }

    /**
     * Create a product. Vendor ID is pulled from the authenticated token.
     */
    async createProduct(vendorId: string, data: CreateProductInput) {
        // Verify category exists
        const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
        if (!category) {
            throw new ApiError(404, 'Category not found');
        }

        return prisma.product.create({
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
    }

    /**
     * Update an existing product. Only the owner VENDOR can update it.
     */
    async updateProduct(id: string, vendorId: string, data: UpdateProductInput) {
        const product = await prisma.product.findUnique({ where: { id } });

        if (!product) {
            throw new ApiError(404, 'Product not found');
        }

        if (product.vendorId !== vendorId) {
            throw new ApiError(403, 'You do not have permission to update this product');
        }

        if (data.categoryId) {
            const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
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
        const product = await prisma.product.findUnique({ where: { id } });

        if (!product) {
            throw new ApiError(404, 'Product not found');
        }

        if (product.vendorId !== vendorId) {
            throw new ApiError(403, 'You do not have permission to delete this product');
        }

        // Deleting the product will automatically delete variants due to onDelete: Cascade in Prisma schema
        await prisma.product.delete({
            where: { id },
        });
    }

    /**
     * Add a variant to a product. Only owner VENDOR.
     */
    async addVariant(productId: string, vendorId: string, data: AddVariantInput) {
        const product = await prisma.product.findUnique({ where: { id: productId } });

        if (!product) {
            throw new ApiError(404, 'Product not found');
        }

        if (product.vendorId !== vendorId) {
            throw new ApiError(403, 'You do not have permission to modify this product');
        }

        const existingSku = await prisma.variant.findUnique({ where: { sku: data.sku } });
        if (existingSku) {
            throw new ApiError(400, 'SKU is already in use by another variant');
        }

        return prisma.variant.create({
            data: {
                ...data,
                productId,
            },
        });
    }

    /**
     * Update a specific variant. Only owner VENDOR.
     */
    async updateVariant(productId: string, variantId: string, vendorId: string, data: UpdateVariantInput) {
        const product = await prisma.product.findUnique({ where: { id: productId } });

        if (!product || product.vendorId !== vendorId) {
            throw new ApiError(403, 'You do not have permission to modify this product');
        }

        const variant = await prisma.variant.findUnique({ where: { id: variantId } });
        if (!variant || variant.productId !== productId) {
            throw new ApiError(404, 'Variant not found for this product');
        }

        if (data.sku && data.sku !== variant.sku) {
            const existingSku = await prisma.variant.findUnique({ where: { sku: data.sku } });
            if (existingSku) {
                throw new ApiError(400, 'SKU is already in use by another variant');
            }
        }

        return prisma.variant.update({
            where: { id: variantId },
            data,
        });
    }
}

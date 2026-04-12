import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { Prisma } from '../../generated/prisma/client';
import { CreateReviewInput, UpdateReviewInput, GetReviewsQueryInput, GetMyReviewsQueryInput } from './review.validation';

const reviewInclude = {
    user: { select: { id: true, name: true, avatar: true } },
};

export class ReviewService {
    /**
     * Create a review for a product.
     * Verifies product exists, user has purchased it (delivered order), and no duplicate.
     */
    async createReview(userId: string, data: CreateReviewInput) {
        const { productId, rating, comment } = data;

        // Verify product exists and is active
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) {
            throw ApiError.notFound('Product not found');
        }

        // Verify user has purchased this product (via a delivered order)
        const hasPurchased = await prisma.order.findFirst({
            where: {
                userId,
                vendorOrders: {
                    some: {
                        status: 'DELIVERED',
                        items: {
                            some: {
                                variant: { productId },
                            },
                        },
                    },
                },
            },
        });

        if (!hasPurchased) {
            throw ApiError.forbidden('You must purchase and receive this product before reviewing it');
        }

        // Create review and update product aggregates atomically
        try {
            const review = await prisma.$transaction(async (tx) => {
                const created = await tx.review.create({
                    data: { userId, productId, rating, comment },
                    include: reviewInclude,
                });

                await tx.$executeRaw`
                    UPDATE products SET
                        "reviewCount" = (SELECT COUNT(*)::int FROM reviews WHERE "productId" = ${productId}),
                        "avgRating" = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE "productId" = ${productId})
                    WHERE id = ${productId}
                `;

                return created;
            });

            return review;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw ApiError.conflict('You have already reviewed this product');
            }
            throw error;
        }
    }

    /**
     * Get paginated reviews for a product with optional rating filter and sorting.
     * Only returns reviews for active products.
     */
    async getProductReviews(productId: string, query: GetReviewsQueryInput) {
        const { page, limit, rating, sort } = query;
        const skip = (page - 1) * limit;

        // Verify product exists and is active
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) {
            throw ApiError.notFound('Product not found');
        }

        const where: Prisma.ReviewWhereInput = {
            productId,
            ...(rating !== undefined && { rating }),
        };

        let orderBy: Prisma.ReviewOrderByWithRelationInput;
        switch (sort) {
            case 'oldest':
                orderBy = { createdAt: 'asc' };
                break;
            case 'highest':
                orderBy = { rating: 'desc' };
                break;
            case 'lowest':
                orderBy = { rating: 'asc' };
                break;
            default:
                orderBy = { createdAt: 'desc' };
        }

        const [total, items] = await Promise.all([
            prisma.review.count({ where }),
            prisma.review.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: reviewInclude,
            }),
        ]);

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }

    /**
     * Get paginated reviews by the authenticated user.
     */
    async getMyReviews(userId: string, query: GetMyReviewsQueryInput) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const [total, items] = await Promise.all([
            prisma.review.count({ where: { userId } }),
            prisma.review.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: { select: { id: true, name: true, images: true, avgRating: true } },
                },
            }),
        ]);

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }

    /**
     * Update an existing review. Only the author can update.
     * TODO: Add ADMIN role override for content moderation.
     */
    async updateReview(reviewId: string, userId: string, data: UpdateReviewInput) {
        const review = await prisma.review.findUnique({ where: { id: reviewId } });

        if (!review) {
            throw ApiError.notFound('Review not found');
        }

        if (review.userId !== userId) {
            throw ApiError.forbidden('You can only update your own reviews');
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.review.update({
                where: { id: reviewId },
                data: {
                    ...(data.rating !== undefined && { rating: data.rating }),
                    ...(data.comment !== undefined && { comment: data.comment }),
                },
                include: reviewInclude,
            });

            // Recalculate only if rating changed
            if (data.rating !== undefined && data.rating !== review.rating) {
                await tx.$executeRaw`
                    UPDATE products SET
                        "avgRating" = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE "productId" = ${review.productId})
                    WHERE id = ${review.productId}
                `;
            }

            return result;
        });

        return updated;
    }

    /**
     * Delete a review. Only the author can delete.
     * TODO: Add ADMIN role override for content moderation.
     */
    async deleteReview(reviewId: string, userId: string) {
        const review = await prisma.review.findUnique({ where: { id: reviewId } });

        if (!review) {
            throw ApiError.notFound('Review not found');
        }

        if (review.userId !== userId) {
            throw ApiError.forbidden('You can only delete your own reviews');
        }

        await prisma.$transaction(async (tx) => {
            await tx.review.delete({ where: { id: reviewId } });

            await tx.$executeRaw`
                UPDATE products SET
                    "reviewCount" = (SELECT COUNT(*)::int FROM reviews WHERE "productId" = ${review.productId}),
                    "avgRating" = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE "productId" = ${review.productId})
                WHERE id = ${review.productId}
            `;
        });
    }
}

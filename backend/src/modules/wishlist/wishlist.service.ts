import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { Prisma } from '../../generated/prisma/client';
import { GetWishlistQueryInput } from './wishlist.validation';

const wishlistProductInclude = {
    product: {
        select: {
            id: true,
            name: true,
            basePrice: true,
            images: true,
            isActive: true,
            avgRating: true,
            reviewCount: true,
            vendor: { select: { id: true, name: true } },
        },
    },
};

export class WishlistService {
    async getWishlist(userId: string, query: GetWishlistQueryInput) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const [total, items] = await Promise.all([
            prisma.wishlistItem.count({ where: { userId } }),
            prisma.wishlistItem.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: wishlistProductInclude,
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

    async toggleWishlistItem(userId: string, productId: string) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) {
            throw ApiError.notFound('Product not found');
        }

        const existing = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });

        if (existing) {
            try {
                await prisma.wishlistItem.delete({ where: { id: existing.id } });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    // Already deleted by a concurrent request — treat as successful removal
                } else {
                    throw error;
                }
            }
            return { action: 'removed' as const, item: null };
        }

        try {
            const item = await prisma.wishlistItem.create({
                data: { userId, productId },
                include: wishlistProductInclude,
            });
            return { action: 'added' as const, item };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw ApiError.conflict('Product is already in your wishlist');
            }
            throw error;
        }
    }

    async removeFromWishlist(userId: string, productId: string) {
        const existing = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });

        if (!existing) {
            throw ApiError.notFound('Item not found in wishlist');
        }

        await prisma.wishlistItem.delete({ where: { id: existing.id } });
    }
}

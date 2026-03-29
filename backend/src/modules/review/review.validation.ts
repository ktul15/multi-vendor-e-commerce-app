import { z } from 'zod';
import { coerceNumber } from '../../utils/zodHelpers';

export const createReviewSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    comment: z.string().trim().min(1, 'Comment must not be empty').max(1000, 'Comment must not exceed 1000 characters').optional(),
});

export const updateReviewSchema = z.object({
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
    comment: z.string().trim().min(1, 'Comment must not be empty').max(1000, 'Comment must not exceed 1000 characters').nullable().optional(),
}).refine(
    (data) => data.rating !== undefined || data.comment !== undefined,
    { message: 'At least one field (rating or comment) must be provided' }
);

export const reviewIdParamSchema = z.object({
    reviewId: z.string().uuid('Invalid review ID'),
});

export const productIdParamSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
});

export const getReviewsQuerySchema = z.object({
    page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
    limit: z.preprocess(coerceNumber, z.number().min(1).max(50).optional().default(10)),
    rating: z.preprocess(coerceNumber, z.number().int().min(1).max(5).optional()),
    sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional().default('newest'),
});

// Narrower schema for my-reviews (no rating filter or sort)
export const getMyReviewsQuerySchema = z.object({
    page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
    limit: z.preprocess(coerceNumber, z.number().min(1).max(50).optional().default(10)),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type GetReviewsQueryInput = z.infer<typeof getReviewsQuerySchema>;
export type GetMyReviewsQueryInput = z.infer<typeof getMyReviewsQuerySchema>;

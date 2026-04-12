import { z } from 'zod';
import { coerceNumber } from '../../utils/zodHelpers';

const productIdField = { productId: z.string().uuid('Invalid product ID') };

export const toggleWishlistSchema = z.object(productIdField);

export const productIdParamSchema = z.object(productIdField);

export const getWishlistQuerySchema = z.object({
    page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
    limit: z.preprocess(coerceNumber, z.number().min(1).max(50).optional().default(10)),
});

export type ToggleWishlistInput = z.infer<typeof toggleWishlistSchema>;
export type GetWishlistQueryInput = z.infer<typeof getWishlistQuerySchema>;

import { z } from 'zod';

export const itemIdParamSchema = z.object({
    itemId: z.string().uuid('Invalid item ID'),
});

export const addCartItemSchema = z.object({
    variantId: z.string().uuid('Invalid variant ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const previewPromoSchema = z.object({
    code: z.string().min(1, 'Promo code is required'),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type PreviewPromoInput = z.infer<typeof previewPromoSchema>;

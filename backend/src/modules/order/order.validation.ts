import { z } from 'zod/v4';

export const createOrderSchema = z.object({
    addressId: z.string().uuid('Invalid address ID'),
    promoCode: z.string().trim().min(1).optional(),
    notes: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

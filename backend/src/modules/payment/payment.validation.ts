import { z } from 'zod/v4';

export const createPaymentIntentSchema = z.object({
    orderId: z.string().uuid('Invalid order ID'),
    currency: z.literal('INR').default('INR'),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

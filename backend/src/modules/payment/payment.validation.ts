import { z } from 'zod/v4';

export const createPaymentIntentSchema = z.object({
    orderId: z.string().uuid('Invalid order ID'),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']).default('USD'),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

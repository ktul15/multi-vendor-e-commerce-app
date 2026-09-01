import { z } from 'zod/v4';

export const createPaymentIntentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  currency: z.literal('INR').default('INR'),
});

export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;

export const confirmRazorpayPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  providerOrderId: z.string().min(1).max(100),
  providerPaymentId: z.string().min(1).max(100),
  signature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid signature format'),
});

export const paymentIdParamSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
});

export const createRefundSchema = z.object({
  amount: z.number().positive().multipleOf(0.01).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

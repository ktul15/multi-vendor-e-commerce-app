import { z } from 'zod/v4';

// Coerce string query params to numbers safely, ignoring empty strings and NaN
const coerceNumber = (val: unknown) => {
  if (val === undefined || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
};

export const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  promoCode: z.string().trim().min(1).optional(),
  notes: z.string().max(500).optional(),
});

export const getOrdersQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(10)
  ),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
});

export const orderParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type GetOrdersQueryInput = z.infer<typeof getOrdersQuerySchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

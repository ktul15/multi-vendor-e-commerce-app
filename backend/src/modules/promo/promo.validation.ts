import { z } from 'zod';
import { coerceNumber, coerceBoolean } from '../../utils/zodHelpers';

export const createPromoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters')
      .max(30, 'Code must not exceed 30 characters')
      .transform((val) => val.toUpperCase()),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().positive('Discount value must be positive'),
    minOrderValue: z
      .number()
      .nonnegative('Minimum order value cannot be negative')
      .optional(),
    maxDiscount: z
      .number()
      .nonnegative('Max discount cannot be negative')
      .optional(),
    usageLimit: z
      .number()
      .int()
      .positive('Usage limit must be a positive integer')
      .optional(),
    perUserLimit: z
      .number()
      .int()
      .positive('Per-user limit must be a positive integer')
      .optional(),
    isActive: z.boolean().optional().default(true),
    expiresAt: z.coerce
      .date()
      .refine((d) => d > new Date(), 'Expiry date must be in the future')
      .optional(),
  })
  .refine(
    (data) => data.discountType !== 'PERCENTAGE' || data.discountValue <= 100,
    {
      message: 'Percentage discount cannot exceed 100',
      path: ['discountValue'],
    }
  );

export const updatePromoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters')
      .max(30, 'Code must not exceed 30 characters')
      .transform((val) => val.toUpperCase())
      .optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z
      .number()
      .positive('Discount value must be positive')
      .optional(),
    minOrderValue: z.number().nonnegative().nullable().optional(),
    maxDiscount: z.number().nonnegative().nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    perUserLimit: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.coerce
      .date()
      .refine((d) => d > new Date(), 'Expiry date must be in the future')
      .nullable()
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })
  .refine(
    (data) =>
      data.discountType !== 'PERCENTAGE' ||
      data.discountValue === undefined ||
      data.discountValue <= 100,
    {
      message: 'Percentage discount cannot exceed 100',
      path: ['discountValue'],
    }
  );

export const getPromosQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(20)
  ),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional()),
  search: z.string().trim().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
});

export const promoIdParamSchema = z.object({
  id: z.string().uuid('Invalid promo code ID'),
});

export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
export type GetPromosQueryInput = z.infer<typeof getPromosQuerySchema>;

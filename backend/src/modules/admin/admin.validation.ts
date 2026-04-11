import { z } from 'zod/v4';
import { coerceNumber, coerceBoolean } from '../../utils/zodHelpers';

const MAX_DATE_RANGE_DAYS = 366;

const dateRangeBase = z
  .object({
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  })
  .refine(
    (d) =>
      !(d.startDate && d.endDate) ||
      new Date(d.startDate) <= new Date(d.endDate),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    }
  )
  .refine(
    (d) => {
      if (!d.startDate || !d.endDate) return true;
      const diffMs =
        new Date(d.endDate).getTime() - new Date(d.startDate).getTime();
      return diffMs <= MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
    },
    {
      message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
      path: ['endDate'],
    }
  );

// ---- Query param schemas ----

export const listUsersQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().int().min(1).default(1)),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).default(20)),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']).optional(),
  isBanned: z.preprocess(coerceBoolean, z.boolean().optional()),
  search: z.string().optional(),
});

export const listVendorsQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().int().min(1).default(1)),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).default(20)),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  search: z.string().optional(),
});

export const listProductsQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().int().min(1).default(1)),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).default(20)),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional()),
  vendorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const listOrdersQuerySchema = dateRangeBase.extend({
  page: z.preprocess(coerceNumber, z.number().int().min(1).default(1)),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).default(20)),
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
  userId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
});

export const revenueQuerySchema = dateRangeBase.extend({
  period: z.enum(['day', 'week', 'month']).default('month'),
});

// ---- Route param schemas ----

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

export const vendorProfileIdParamSchema = z.object({
  vendorProfileId: z.string().uuid(),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

// ---- Body schemas ----

export const updateCommissionSchema = z.object({
  // min(0) allows a 0% commission (e.g. promotional periods); consistent with vendor override schema
  rate: z.number().min(0).max(100),
});

export const updateVendorCommissionSchema = z.object({
  rate: z.number().min(0).max(100).nullable(),
});

// ---- Inferred types ----

export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
export type ListVendorsQueryInput = z.infer<typeof listVendorsQuerySchema>;
export type ListProductsQueryInput = z.infer<typeof listProductsQuerySchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
export type RevenueQueryInput = z.infer<typeof revenueQuerySchema>;
export type UpdateCommissionInput = z.infer<typeof updateCommissionSchema>;
export type UpdateVendorCommissionInput = z.infer<typeof updateVendorCommissionSchema>;
export type OrderIdParamInput = z.infer<typeof orderIdParamSchema>;

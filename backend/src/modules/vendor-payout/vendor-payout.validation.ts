import { z } from 'zod/v4';
import { coerceNumber } from '../../utils/zodHelpers';

export const getEarningsQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(10)
  ),
  status: z.enum(['PENDING', 'TRANSFERRED', 'FAILED', 'REVERSED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const getPayoutsQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(10)
  ),
  status: z.enum(['PENDING', 'PAID', 'FAILED']).optional(),
});

export const updateCommissionRateSchema = z.object({
  commissionRate: z
    .number()
    .min(0, 'Commission rate cannot be negative')
    .max(100, 'Commission rate cannot exceed 100%'),
});

export const vendorIdParamSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
});

export type GetEarningsQueryInput = z.infer<typeof getEarningsQuerySchema>;
export type GetPayoutsQueryInput = z.infer<typeof getPayoutsQuerySchema>;
export type UpdateCommissionRateInput = z.infer<
  typeof updateCommissionRateSchema
>;

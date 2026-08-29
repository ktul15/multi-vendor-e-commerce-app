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

export const updatePaymentProviderSchema = z
  .object({
    paymentProvider: z.enum(['STRIPE', 'RAZORPAY']),
    settlementCountry: z
      .string()
      .regex(/^[A-Z]{2}$/, 'Settlement country must be an ISO alpha-2 code'),
  })
  .superRefine((value, context) => {
    if (
      value.paymentProvider === 'RAZORPAY' &&
      value.settlementCountry !== 'IN'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['settlementCountry'],
        message: 'Razorpay Route is configured only for Indian vendors',
      });
    }
    if (
      value.paymentProvider === 'STRIPE' &&
      value.settlementCountry === 'IN'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['settlementCountry'],
        message:
          'Indian vendors must use Razorpay in this sandbox architecture',
      });
    }
  });

export type GetEarningsQueryInput = z.infer<typeof getEarningsQuerySchema>;
export type GetPayoutsQueryInput = z.infer<typeof getPayoutsQuerySchema>;
export type UpdateCommissionRateInput = z.infer<
  typeof updateCommissionRateSchema
>;

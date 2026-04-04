import { z } from 'zod/v4';
import { coerceNumber } from '../../utils/zodHelpers';

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

export const summaryQuerySchema = dateRangeBase;

export const salesQuerySchema = dateRangeBase.extend({
  period: z.enum(['day', 'week', 'month']).default('day'),
});

export const topProductsQuerySchema = dateRangeBase.extend({
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(20).optional().default(5)),
});

export type SummaryQueryInput = z.infer<typeof summaryQuerySchema>;
export type SalesQueryInput = z.infer<typeof salesQuerySchema>;
export type TopProductsQueryInput = z.infer<typeof topProductsQuerySchema>;

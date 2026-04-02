import { z } from 'zod';

export const updateVendorProfileSchema = z.object({
  storeName: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must be at most 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .trim()
    .optional(),
});

export type UpdateVendorProfileInput = z.infer<
  typeof updateVendorProfileSchema
>;

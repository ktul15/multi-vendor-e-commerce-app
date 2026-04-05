import { z } from 'zod/v4';
import { coerceNumber, coerceBoolean } from '../../utils/zodHelpers';

// imageUrl is not validated here — it comes from Cloudinary after the multer upload

export const createBannerSchema = z.object({
  title: z.string().trim().min(1).max(200),
  // Accept a URL string or empty string (treated as null)
  linkUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  position: z.preprocess(coerceNumber, z.number().int().min(0).default(0)),
  isActive: z.preprocess(coerceBoolean, z.boolean().default(true)),
});

export const updateBannerSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    // Accept empty string or null to explicitly clear the linkUrl
    linkUrl: z
      .string()
      .url()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v === '' ? null : v ?? undefined))
      .nullable()
      .optional(),
    position: z.preprocess(coerceNumber, z.number().int().min(0).optional()),
    isActive: z.preprocess(coerceBoolean, z.boolean().optional()),
  })
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    { message: 'At least one field must be provided' }
  );

export const bannerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listBannersQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().int().min(1).default(1)),
  limit: z.preprocess(coerceNumber, z.number().int().min(1).max(100).default(20)),
  isActive: z.preprocess(coerceBoolean, z.boolean().optional()),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type ListBannersQueryInput = z.infer<typeof listBannersQuerySchema>;

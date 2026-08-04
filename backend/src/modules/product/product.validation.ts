import { z } from 'zod';
import { coerceNumber, coerceBoolean } from '../../utils/zodHelpers';

const coerceStrictNumber = (value: unknown) => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const coerceStrictBoolean = (value: unknown) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export const variantSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative'),
  stock: z.number().int().nonnegative('Stock must be non-negative').default(0),
  sku: z.string().min(1, 'SKU is required'),
});

export const createProductSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category ID'),
    name: z
      .string({ message: 'Name is required' })
      .min(2, 'Name must be at least 2 characters'),
    description: z
      .string({ message: 'Description is required' })
      .min(10, 'Description must be at least 10 characters'),
    basePrice: z
      .number({ message: 'Base price is required' })
      .nonnegative('Base price must be non-negative'),
    images: z
      .array(z.string().url('Invalid image URL'))
      .max(5, 'Maximum 5 images allowed')
      .optional()
      .default([]),
    isActive: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    variants: z.array(variantSchema).min(1, 'At least one variant is required'),
  })
  .superRefine((data, context) => {
    const seen = new Set<string>();
    data.variants.forEach((variant, index) => {
      if (seen.has(variant.sku)) {
        context.addIssue({
          code: 'custom',
          message: 'SKU values must be unique within a product',
          path: ['variants', index, 'sku'],
        });
      }
      seen.add(variant.sku);
    });
  });

export const updateProductSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .optional(),
    basePrice: z
      .number()
      .nonnegative('Base price must be non-negative')
      .optional(),
    images: z
      .array(z.string().url('Invalid image URL'))
      .max(5, 'Maximum 5 images allowed')
      .optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
    path: [],
  });

// Used specifically for variant additions on an existing product
export const addVariantSchema = variantSchema;

export const updateVariantSchema = z
  .object({
    size: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    price: z.number().nonnegative('Price must be non-negative').optional(),
    stock: z
      .number()
      .int()
      .nonnegative('Stock must be non-negative')
      .optional(),
    sku: z.string().min(1, 'SKU is required').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
    path: [],
  });

export const vendorInventoryQuerySchema = z.object({
  page: z.preprocess(
    coerceStrictNumber,
    z.number().int().min(1).optional().default(1)
  ),
  limit: z.preprocess(
    coerceStrictNumber,
    z.number().int().min(1).max(100).optional().default(10)
  ),
  search: z.string().trim().min(1).max(100).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  isActive: z.preprocess(coerceStrictBoolean, z.boolean().optional()),
  inStock: z.preprocess(coerceStrictBoolean, z.boolean().optional()),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'basePrice'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const productParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export const productVariantParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  vid: z.string().uuid('Invalid variant ID'),
});

export const getProductQuerySchema = z
  .object({
    page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
    limit: z.preprocess(
      coerceNumber,
      z.number().min(1).max(100).optional().default(10)
    ),
    sort: z
      .enum(['newest', 'price_asc', 'price_desc', 'rating', 'popular'])
      .optional()
      .default('newest'),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    minPrice: z.preprocess(coerceNumber, z.number().nonnegative().optional()),
    maxPrice: z.preprocess(coerceNumber, z.number().nonnegative().optional()),
    rating: z.preprocess(coerceNumber, z.number().min(0).max(5).optional()),
    inStock: z.preprocess(coerceBoolean, z.boolean().optional()),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    { message: 'minPrice must not exceed maxPrice', path: ['minPrice'] }
  );

export const searchProductQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(10)
  ),
  sort: z
    .enum(['newest', 'price_asc', 'price_desc', 'rating', 'popular'])
    .optional()
    .default('newest'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddVariantInput = z.infer<typeof addVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type GetProductQueryInput = z.infer<typeof getProductQuerySchema>;
export type SearchProductQueryInput = z.infer<typeof searchProductQuerySchema>;
export type VendorInventoryQueryInput = z.infer<
  typeof vendorInventoryQuerySchema
>;

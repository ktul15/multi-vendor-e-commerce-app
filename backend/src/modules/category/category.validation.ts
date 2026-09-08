import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  image: z.string().url('Invalid image URL').optional(),
  parentId: z.string().uuid('Invalid parent ID format').optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  image: z.string().url('Invalid image URL').optional(),
  parentId: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid('Invalid parent ID format').nullable().optional()
  ),
});

export const categoryParamSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

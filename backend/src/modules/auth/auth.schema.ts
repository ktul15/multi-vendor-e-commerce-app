import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters')
      .trim(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must be at most 100 characters'),
    role: z.enum(['CUSTOMER', 'VENDOR']).optional().default('CUSTOMER'),
    storeName: z
      .string()
      .min(2, 'Store name must be at least 2 characters')
      .max(100, 'Store name must be at most 100 characters')
      .trim()
      .optional(),
  })
  .refine(
    (data) => data.role !== 'VENDOR' || (data.storeName && data.storeName.length > 0),
    { message: 'Store name is required for vendor registration', path: ['storeName'] }
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Type inference — use these in controllers for type safety
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

import { z } from 'zod';

export const addressParamSchema = z.object({
    id: z.string().uuid('Invalid address ID'),
});

export const createAddressSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    phone: z.string().min(7, 'Phone must be at least 7 characters').max(20, 'Phone must be at most 20 characters'),
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().length(2, 'Country must be a 2-letter ISO 3166-1 alpha-2 code').toUpperCase(),
    zipCode: z.string().min(3, 'Zip code must be at least 3 characters').max(10, 'Zip code must be at most 10 characters'),
    isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = z
    .object({
        fullName: z.string().min(1).optional(),
        phone: z.string().min(7).max(20).optional(),
        street: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().min(1).optional(),
        country: z.string().length(2).toUpperCase().optional(),
        zipCode: z.string().min(3).max(10).optional(),
        isDefault: z.boolean().optional(),
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
        message: 'At least one field must be provided',
    });

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

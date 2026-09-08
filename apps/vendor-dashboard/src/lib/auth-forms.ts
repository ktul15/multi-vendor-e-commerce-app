import { z } from "zod";

export const vendorLoginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const vendorRegistrationSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your password"),
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be at most 100 characters"),
    storeName: z
      .string()
      .trim()
      .min(2, "Store name must be at least 2 characters")
      .max(100, "Store name must be at most 100 characters"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type VendorLoginValues = z.infer<typeof vendorLoginSchema>;
export type VendorRegistrationValues = z.infer<typeof vendorRegistrationSchema>;

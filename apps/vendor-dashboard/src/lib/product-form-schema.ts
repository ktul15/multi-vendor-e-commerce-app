import { z } from "zod";

const httpsUrl = z
  .string()
  .url("Enter a valid image URL")
  .refine((value) => new URL(value).protocol === "https:", "Image URL must use HTTPS");

export const productFormSchema = z
  .object({
    basePrice: z.number().min(0, "Base price must be non-negative"),
    categoryId: z.string().uuid("Choose a category"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    images: z.array(httpsUrl).max(5, "Maximum 5 images allowed"),
    isActive: z.boolean(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    tags: z.array(z.string()),
    variants: z
      .array(
        z.object({
          color: z.string().optional(),
          id: z.string().uuid().optional(),
          price: z.number().min(0, "Price must be non-negative"),
          size: z.string().optional(),
          sku: z.string().min(1, "SKU is required"),
          stock: z
            .number()
            .int("Stock must be a whole number")
            .min(0, "Stock must be non-negative"),
        }),
      )
      .min(1, "At least one variant is required"),
  })
  .superRefine((data, context) => {
    const seen = new Set<string>();
    data.variants.forEach((variant, index) => {
      if (seen.has(variant.sku)) {
        context.addIssue({
          code: "custom",
          message: "SKU values must be unique within a product",
          path: ["variants", index, "sku"],
        });
      }
      seen.add(variant.sku);
    });
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

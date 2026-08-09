import { z } from "zod";

const httpsUrl = z
  .string()
  .url("Enter a valid image URL")
  .refine((value) => new URL(value).protocol === "https:", "Image URL must use HTTPS");

const optionalOption = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const variantIdentitySchema = z.object({
  color: optionalOption,
  id: z.string().uuid().optional(),
  size: optionalOption,
  sku: z.string().trim().min(1, "SKU is required"),
  stock: z.number().int("Stock must be a whole number").min(0, "Stock must be non-negative"),
});

type VariantIdentity = z.infer<typeof variantIdentitySchema>;

function addVariantIdentityIssues(variants: readonly VariantIdentity[], context: z.RefinementCtx) {
  const skus = new Set<string>();
  const combinations = new Set<string>();

  variants.forEach((variant, index) => {
    const sku = variant.sku.toLocaleLowerCase();
    if (skus.has(sku)) {
      context.addIssue({
        code: "custom",
        message: "SKU values must be unique within a product",
        path: ["variants", index, "sku"],
      });
    }
    skus.add(sku);

    if (variants.length === 1) return;
    if (!variant.size && !variant.color) {
      context.addIssue({
        code: "custom",
        message: "Add a size or color when a product has multiple variants",
        path: ["variants", index, "size"],
      });
      return;
    }

    const combination = `${variant.size?.toLocaleLowerCase() ?? ""}\u0000${
      variant.color?.toLocaleLowerCase() ?? ""
    }`;
    if (combinations.has(combination)) {
      context.addIssue({
        code: "custom",
        message: "Size and color combinations must be unique",
        path: ["variants", index, "color"],
      });
    }
    combinations.add(combination);
  });
}

const productFields = {
  basePrice: z.number().min(0, "Base price must be non-negative"),
  categoryId: z.string().uuid("Choose a category"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  images: z.array(httpsUrl).max(5, "Maximum 5 images allowed"),
  isActive: z.boolean(),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  tags: z.array(z.string().trim()).transform((tags) => tags.filter(Boolean)),
};

export const productFormSchema = z
  .object({
    ...productFields,
    variants: z
      .array(
        variantIdentitySchema.extend({
          price: z.number().min(0, "Price must be non-negative"),
        }),
      )
      .min(1, "At least one variant is required"),
  })
  .superRefine((data, context) => addVariantIdentityIssues(data.variants, context));

export const productEditorSchema = z
  .object({
    ...productFields,
    variants: z
      .array(
        variantIdentitySchema.extend({
          priceAdjustment: z.number({ message: "Enter a valid price adjustment" }),
        }),
      )
      .min(1, "At least one variant is required"),
  })
  .superRefine((data, context) => {
    addVariantIdentityIssues(data.variants, context);
    data.variants.forEach((variant, index) => {
      if (data.basePrice + variant.priceAdjustment < 0) {
        context.addIssue({
          code: "custom",
          message: "Adjustment cannot make the variant price negative",
          path: ["variants", index, "priceAdjustment"],
        });
      }
    });
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductEditorValues = z.infer<typeof productEditorSchema>;

export function toProductFormValues(values: ProductEditorValues): ProductFormValues {
  return {
    ...values,
    variants: values.variants.map(({ priceAdjustment, ...variant }) => ({
      ...variant,
      price: Math.round((values.basePrice + priceAdjustment) * 100) / 100,
    })),
  };
}

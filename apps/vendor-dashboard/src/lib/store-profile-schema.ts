import { z } from "zod";

export const MAX_STORE_IMAGE_BYTES = 5 * 1024 * 1024;
export const STORE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const storeProfileSchema = z.object({
  description: z.string().trim().max(1000, "Description must be at most 1000 characters"),
  storeName: z
    .string()
    .trim()
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name must be at most 100 characters"),
});

export type StoreProfileValues = z.infer<typeof storeProfileSchema>;

export function storeImageError(file: File): string | undefined {
  if (!STORE_IMAGE_TYPES.some((type) => type === file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_STORE_IMAGE_BYTES) return "Image must be 5 MB or smaller.";
}

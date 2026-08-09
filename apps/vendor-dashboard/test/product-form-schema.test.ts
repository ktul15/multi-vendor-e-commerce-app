import { describe, expect, it } from "vitest";
import { productFormSchema } from "../src/lib/product-form-schema";

const valid = {
  basePrice: 10,
  categoryId: "11111111-1111-4111-8111-111111111111",
  description: "A complete product description.",
  images: ["https://images.test/item.jpg"],
  isActive: true,
  name: "Item",
  tags: [],
  variants: [{ price: 10, sku: "ITEM-1", stock: 2 }],
};

describe("product form validation", () => {
  it("accepts the backend create limits", () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ ...valid, description: "short" }, "Description must be at least 10 characters"],
    [{ ...valid, images: ["http://images.test/item.jpg"] }, "Image URL must use HTTPS"],
    [
      {
        ...valid,
        images: Array.from({ length: 6 }, (_, index) => `https://images.test/${index}.jpg`),
      },
      "Maximum 5 images allowed",
    ],
    [{ ...valid, variants: [] }, "At least one variant is required"],
    [
      {
        ...valid,
        variants: [
          { price: 10, sku: "DUP", stock: 1 },
          { price: 12, sku: "DUP", stock: 2 },
        ],
      },
      "SKU values must be unique within a product",
    ],
  ])("rejects invalid product values", (value, message) => {
    const result = productFormSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.message)).toContain(message);
  });
});

import { describe, expect, it } from "vitest";
import {
  productEditorSchema,
  productFormSchema,
  toProductFormValues,
} from "../src/lib/product-form-schema";

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

  it("normalizes variant identity and rejects duplicate SKUs regardless of casing", () => {
    const result = productFormSchema.safeParse({
      ...valid,
      variants: [
        { color: " Black ", price: 10, size: " M ", sku: " Item-M ", stock: 1 },
        { color: "Blue", price: 12, size: "M", sku: "item-m", stock: 2 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: "SKU values must be unique within a product" }),
        ]),
      );
    }
  });

  it.each([
    [
      [
        { color: "", priceAdjustment: 0, size: "", sku: "ITEM-1", stock: 1 },
        { color: "Blue", priceAdjustment: 2, size: "M", sku: "ITEM-2", stock: 2 },
      ],
      "Add a size or color when a product has multiple variants",
    ],
    [
      [
        { color: " Blue ", priceAdjustment: 0, size: "M", sku: "ITEM-1", stock: 1 },
        { color: "blue", priceAdjustment: 2, size: "m", sku: "ITEM-2", stock: 2 },
      ],
      "Size and color combinations must be unique",
    ],
  ])("rejects incomplete or duplicate option combinations", (variants, message) => {
    const result = productEditorSchema.safeParse({ ...valid, variants });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(message);
    }
  });

  it("converts editable price adjustments to normalized API variant prices", () => {
    const parsed = productEditorSchema.parse({
      ...valid,
      basePrice: 10,
      variants: [
        { color: " Blue ", priceAdjustment: -1.25, size: " M ", sku: " ITEM-M ", stock: 3 },
      ],
    });

    expect(toProductFormValues(parsed).variants).toEqual([
      { color: "Blue", price: 8.75, size: "M", sku: "ITEM-M", stock: 3 },
    ]);
  });

  it("rejects an adjustment that would make the final price negative", () => {
    const result = productEditorSchema.safeParse({
      ...valid,
      variants: [{ priceAdjustment: -10.01, sku: "ITEM-1", stock: 2 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Adjustment cannot make the variant price negative",
      );
    }
  });
});

import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProductInventory } from "../app/product-inventory";
import ProductsLoading from "../app/(protected)/products/loading";
import type { VendorInventory } from "../src/lib/product-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const state = {
  page: 2,
  pageSize: 10,
  search: "headset",
  sortBy: "name" as const,
  sortOrder: "asc" as const,
};

const inventory: VendorInventory = {
  items: [
    {
      avgRating: "4.50",
      basePrice: "1200.00",
      category: { id: "category-1", name: "Audio" },
      categoryId: "category-1",
      createdAt: "2026-08-01T00:00:00.000Z",
      description: "Wireless headset",
      id: "11111111-1111-4111-8111-111111111111",
      images: [],
      isActive: false,
      media: [],
      name: "Studio Headset",
      reviewCount: 2,
      tags: [],
      updatedAt: "2026-08-09T00:00:00.000Z",
      variants: [
        {
          color: "Black",
          createdAt: "2026-08-01T00:00:00.000Z",
          id: "variant-1",
          price: "1200.00",
          productId: "11111111-1111-4111-8111-111111111111",
          size: null,
          sku: "HEADSET-BLK",
          stock: 4,
          updatedAt: "2026-08-09T00:00:00.000Z",
        },
        {
          color: "White",
          createdAt: "2026-08-01T00:00:00.000Z",
          id: "variant-2",
          price: "1500.00",
          productId: "11111111-1111-4111-8111-111111111111",
          size: null,
          sku: "HEADSET-WHT",
          stock: 3,
          updatedAt: "2026-08-09T00:00:00.000Z",
        },
      ],
      vendor: { id: "vendor-1", name: "Vendor" },
      vendorId: "vendor-1",
    },
  ],
  meta: { limit: 10, page: 2, total: 24, totalPages: 3 },
};

describe("product inventory", () => {
  it("announces the route loading state", () => {
    renderWithProviders(<ProductsLoading />);
    expect(screen.getByText("Loading vendor inventory")).toBeInTheDocument();
  });

  it("renders price, stock, listing state, permissions, sorting, and pagination", () => {
    renderWithProviders(<ProductInventory inventory={inventory} state={state} />);

    const table = screen.getByRole("table", { name: "Vendor product inventory" });
    expect(within(table).getByText("₹1,200.00")).toBeVisible();
    expect(within(table).getByText("Variants: ₹1,200.00–₹1,500.00")).toBeVisible();
    expect(within(table).getByText("Low stock")).toBeVisible();
    expect(within(table).getByText("Inactive")).toBeVisible();
    expect(within(table).getByText("Hidden from customers")).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit Studio Headset" })).toHaveAttribute(
      "href",
      "/products/11111111-1111-4111-8111-111111111111/edit",
    );
    expect(screen.getByRole("button", { name: "Delete Studio Headset" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Sort by Product descending" })).toHaveAttribute(
      "href",
      expect.stringContaining("search=headset"),
    );
    expect(screen.getByRole("link", { name: "Previous" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Next" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Sort by created newest" })).toHaveAttribute(
      "href",
      expect.stringContaining("direction=desc"),
    );
  });

  it("labels the created sort action from its target direction", () => {
    renderWithProviders(
      <ProductInventory
        inventory={inventory}
        state={{ ...state, sortBy: "createdAt", sortOrder: "desc" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Sort by created oldest" })).toHaveAttribute(
      "href",
      expect.stringContaining("direction=asc"),
    );
  });

  it.each([
    [0, "Out of stock"],
    [10, "Low stock"],
    [11, "In stock"],
  ] as const)("formats %i total units as %s", (stock, label) => {
    const item = inventory.items[0]!;
    renderWithProviders(
      <ProductInventory
        inventory={{
          items: [
            {
              ...item,
              variants: [
                {
                  ...item.variants[0]!,
                  price: "1299.5",
                  stock,
                },
              ],
            },
          ],
          meta: { limit: 10, page: 1, total: 1, totalPages: 1 },
        }}
        state={{ ...state, page: 1 }}
      />,
    );

    const table = within(screen.getByRole("table", { name: "Vendor product inventory" }));
    expect(table.getByText(label)).toBeVisible();
    expect(table.getByText(`${stock} units total`)).toBeVisible();
    expect(table.getByText("Variants: ₹1,299.50")).toBeVisible();
  });

  it("renders filtered empty and request failure states", () => {
    const { rerender } = renderWithProviders(
      <ProductInventory
        inventory={{ items: [], meta: { limit: 10, page: 1, total: 0, totalPages: 1 } }}
        state={{ ...state, page: 1 }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No matching products" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/products",
    );

    rerender(<ProductInventory error="Products could not be loaded." state={state} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Products could not be loaded.");
  });
});

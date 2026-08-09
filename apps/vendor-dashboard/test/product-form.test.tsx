import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "../app/product-form";
import type { Category, EditableProduct } from "../src/lib/product-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const categories: Category[] = [
  { children: [], id: "11111111-1111-4111-8111-111111111111", name: "Available" },
];
const product: EditableProduct = {
  basePrice: "10",
  categoryId: "99999999-9999-4999-8999-999999999999",
  description: "A complete product description.",
  id: "22222222-2222-4222-8222-222222222222",
  images: [],
  isActive: true,
  media: [],
  name: "Existing product",
  tags: [],
  variants: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      price: "10",
      sku: "EXISTING-1",
      stock: 2,
    },
  ],
};

describe("product form navigation protection", () => {
  it("blocks internal links and browser history while changes are unsaved", async () => {
    render(
      <>
        <a href="/orders">Orders</a>
        <ProductForm categories={[]} />
      </>,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Changed" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await waitFor(() => expect(screen.getByLabelText(/Name/)).toHaveValue("Changed"));
    const clickAllowed = screen
      .getByRole("link", { name: "Orders" })
      .dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));

    expect(clickAllowed).toBe(false);
    expect(confirm).toHaveBeenCalledWith("Discard your unsaved product changes?");

    const pushState = vi.spyOn(window.history, "pushState");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(pushState).toHaveBeenCalledWith(null, "", window.location.href);
  });

  it("does not submit an edit with a category that is no longer available", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<ProductForm categories={categories} product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Choose an available category")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears and rejects a disabled category already assigned to an edit", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <ProductForm
        categories={categories}
        disabledCategoryIds={new Set([categories[0]!.id])}
        product={{ ...product, categoryId: categories[0]!.id }}
      />,
    );

    await waitFor(() => expect(screen.getByRole("combobox", { name: /Category/ })).toHaveValue(""));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Choose a category")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
});

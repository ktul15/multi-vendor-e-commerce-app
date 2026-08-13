import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminProductDetailView } from "../app/admin-product-detail-view";
import { AdminProductsView } from "../app/admin-products-view";
import type { AdminProduct, AdminProductDetail } from "../src/lib/product-data";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  navigation.push.mockReset();
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "admin_csrf_token=csrf-token; path=/";
});

function product(isActive: boolean, idPrefix: string): AdminProduct {
  return {
    _count: { variants: 2 },
    avgRating: "4.25",
    basePrice: "1299.00",
    category: { id: "22222222-2222-4222-8222-222222222222", name: "Shirts" },
    createdAt: "2026-08-09T08:00:00.000Z",
    id: `${idPrefix}-1111-4111-8111-111111111111`,
    isActive,
    name: isActive ? "Linen Shirt" : "Archived Shirt",
    reviewCount: 8,
    vendor: { email: "asha@example.test", id: "vendor-1", name: "Asha" },
  };
}

const detail: AdminProductDetail = {
  ...product(true, "11111111"),
  category: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Shirts",
    parentId: null,
    slug: "shirts",
  },
  categoryId: "22222222-2222-4222-8222-222222222222",
  description: "Breathable linen shirt",
  images: [],
  media: [
    {
      createdAt: "2026-08-09T08:00:00.000Z",
      id: "33333333-3333-4333-8333-333333333333",
      position: 0,
      updatedAt: "2026-08-09T08:00:00.000Z",
      url: "https://cdn.test/linen-shirt.jpg",
    },
  ],
  tags: ["linen", "summer"],
  updatedAt: "2026-08-10T08:00:00.000Z",
  variants: [
    {
      color: "Blue",
      createdAt: "2026-08-09T08:00:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      price: "1399.00",
      productId: "11111111-1111-4111-8111-111111111111",
      size: "M",
      sku: "LINEN-BLU-M",
      stock: 7,
      updatedAt: "2026-08-09T08:00:00.000Z",
    },
  ],
  vendor: {
    email: "asha@example.test",
    id: "vendor-1",
    name: "Asha",
    vendorProfile: {
      id: "55555555-5555-4555-8555-555555555555",
      status: "APPROVED",
      storeName: "Asha Market",
    },
  },
  vendorId: "vendor-1",
};

const state = { page: 1, pageSize: 20, search: "" } as const;

describe("admin product moderation", () => {
  it("renders active and inactive products with valid moderation actions", () => {
    renderWithProviders(
      <AdminProductsView
        products={{
          items: [product(true, "11111111"), product(false, "22222222")],
          meta: { limit: 20, page: 1, total: 2, totalPages: 1 },
        }}
        state={state}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getByRole("button", { name: "Deactivate" })).toBeVisible();
    expect(within(rows[0]!).getByRole("button", { name: "Delete" })).toBeVisible();
    expect(within(rows[1]!).getByRole("button", { name: "Activate" })).toBeVisible();
    expect(within(rows[1]!).getByRole("button", { name: "Delete" })).toBeVisible();
  });

  it("requires confirmation, prevents duplicate requests, and refreshes success", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminProductsView
        products={{
          items: [product(false, "22222222")],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
        state={state}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Activate" }));
    const dialog = screen.getByRole("dialog", { name: "Activate Archived Shirt?" });
    const confirm = within(dialog).getByRole("button", { name: "Confirm activate" });
    confirm.click();
    confirm.click();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/moderation"),
      expect.objectContaining({
        body: JSON.stringify({ action: "activate" }),
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
      }),
    );
    resolveResponse(Response.json({ data: { isActive: true }, success: true }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("keeps confirmation open and reports stale moderation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Product is already inactive", success: false }, { status: 409 }),
      ),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminProductsView
        products={{
          items: [product(true, "11111111")],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
        state={state}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("dialog");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm deactivate" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already inactive");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("renders complete product, vendor, category, media, variant, price, and stock details", () => {
    renderWithProviders(<AdminProductDetailView product={detail} />);
    expect(screen.getByRole("heading", { name: "Linen Shirt" })).toBeVisible();
    expect(screen.getByText("₹1,299.00")).toBeVisible();
    expect(screen.getByText("Breathable linen shirt")).toBeVisible();
    expect(screen.getByRole("link", { name: "Asha Market" })).toHaveAttribute(
      "href",
      "/vendors/55555555-5555-4555-8555-555555555555",
    );
    expect(screen.getByRole("link", { name: "Image 1" })).toHaveAttribute(
      "href",
      "https://cdn.test/linen-shirt.jpg",
    );
    expect(screen.getByRole("rowheader", { name: "LINEN-BLU-M" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "7" })).toBeVisible();
  });

  it("confirms permanent deletion and returns to the product list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const actor = userEvent.setup();
    renderWithProviders(<AdminProductDetailView product={detail} />);
    await actor.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Linen Shirt?" });
    expect(dialog).toHaveTextContent("Products with order history must be deactivated instead");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/products"));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("shows filtered empty and retryable error states", () => {
    const { rerender } = renderWithProviders(
      <AdminProductsView
        products={{ items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } }}
        state={{ ...state, status: "inactive" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No matching products" })).toBeVisible();
    rerender(<AdminProductsView error="Products could not be loaded." state={state} />);
    expect(screen.getByRole("heading", { name: "Products unavailable" })).toBeVisible();
  });
});

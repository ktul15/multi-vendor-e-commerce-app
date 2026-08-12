import { renderWithProviders } from "@repo/test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
    renderWithProviders(
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
    renderWithProviders(<ProductForm categories={categories} product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Choose an available category")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears and rejects a disabled category already assigned to an edit", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    renderWithProviders(
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

describe("product variant inventory editor", () => {
  const availability = (units: number) =>
    screen.getByText(
      (_, element) =>
        element?.tagName === "OUTPUT" &&
        element.textContent?.replace(/\s+/g, " ").trim() ===
          `${units} ${units === 1 ? "unit" : "units"}`,
    );

  it("adds variant rows and derives total availability from their stock", async () => {
    renderWithProviders(<ProductForm categories={categories} />);

    expect(availability(0)).toBeVisible();
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Stock/ }), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add variant" }));
    const stockInputs = screen.getAllByRole("spinbutton", { name: /^Stock/ });
    fireEvent.change(stockInputs[1]!, { target: { value: "3" } });

    await waitFor(() => expect(availability(7)).toBeVisible());
    expect(screen.getAllByRole("spinbutton", { name: /^Price adjustment/ })).toHaveLength(2);
    expect(screen.getAllByLabelText("Size")).toHaveLength(2);
    expect(screen.getAllByLabelText("Color")).toHaveLength(2);
  });

  it("loads adjustments for edits and submits final prices with updated stock", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);
    renderWithProviders(
      <ProductForm
        categories={categories}
        product={{ ...product, categoryId: categories[0]!.id }}
      />,
    );

    const adjustment = screen.getByRole("spinbutton", { name: /^Price adjustment/ });
    expect(adjustment).toHaveValue(0);
    expect(availability(2)).toBeVisible();

    fireEvent.change(adjustment, { target: { value: "-2" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Stock/ }), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      basePrice: 10,
      variants: [
        {
          id: product.variants[0]!.id,
          price: 8,
          sku: "EXISTING-1",
          stock: 5,
        },
      ],
    });
  });

  it("prevents duplicate saves before the pending state renders", async () => {
    let resolveSave!: (response: Response) => void;
    const fetch = vi.fn<typeof globalThis.fetch>(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );
    vi.stubGlobal("fetch", fetch);
    renderWithProviders(
      <ProductForm
        categories={categories}
        product={{ ...product, categoryId: categories[0]!.id }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Updated product" } });
    const form = screen.getByRole("button", { name: "Save changes" }).closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    resolveSave(Response.json({ data: { id: product.id, media: [] }, success: true }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
  });
});

describe("product media save recovery", () => {
  it("updates the saved product instead of creating a duplicate after an upload failure", async () => {
    const createdProductId = "44444444-4444-4444-8444-444444444444";
    const uploadedMedia = {
      createdAt: "2026-08-09T00:00:00.000Z",
      id: "55555555-5555-4555-8555-555555555555",
      position: 0,
      updatedAt: "2026-08-09T00:00:00.000Z",
      url: "https://images.test/product.webp",
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json(
          { data: { id: createdProductId, media: [] }, success: true },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ message: "Upload unavailable", success: false }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { id: createdProductId, media: [] }, success: true }),
      )
      .mockResolvedValueOnce(Response.json({ data: [uploadedMedia], success: true }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:product.webp");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    renderWithProviders(<ProductForm categories={categories} />);

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "New product" } });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "A complete product description." },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /Category/ }));
    fireEvent.click(screen.getByRole("option", { name: "Available" }));
    fireEvent.change(screen.getByLabelText(/SKU/), { target: { value: "NEW-1" } });
    fireEvent.change(screen.getByLabelText("Add images"), {
      target: {
        files: [new File(["image"], "product.webp", { type: "image/webp" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(
      await screen.findByText("The product was saved, but one or more images failed to upload."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));

    expect(fetch.mock.calls.map(([url, request]) => [url, request?.method])).toEqual([
      ["/api/products", "POST"],
      [`/api/products/${createdProductId}/media`, "POST"],
      [`/api/products/${createdProductId}`, "PUT"],
      [`/api/products/${createdProductId}/media`, "POST"],
    ]);
  });

  it("locks media controls during a standalone retry", async () => {
    let resolveRetry!: (response: Response) => void;
    const retryResponse = new Promise<Response>((resolve) => {
      resolveRetry = resolve;
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: { id: product.id, media: [] }, success: true }))
      .mockResolvedValueOnce(
        Response.json({ message: "Upload unavailable", success: false }, { status: 503 }),
      )
      .mockReturnValueOnce(retryResponse);
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:retry.webp");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    renderWithProviders(
      <ProductForm
        categories={categories}
        product={{ ...product, categoryId: categories[0]!.id }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Add images"), {
      target: { files: [new File(["image"], "retry.webp", { type: "image/webp" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("The product was saved, but one or more images failed to upload."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry upload for retry.webp" }));

    await waitFor(() => expect(screen.getByLabelText("Add images")).toBeDisabled());
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.submit(document.querySelector("form")!);
    expect(fetch).toHaveBeenCalledTimes(3);
    resolveRetry(Response.json({ data: [], success: true }));
    await waitFor(() => expect(screen.getByLabelText("Add images")).toBeEnabled());
  });
});

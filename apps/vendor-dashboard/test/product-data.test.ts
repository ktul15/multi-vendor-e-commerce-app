import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductFormData, getVendorInventory } from "../src/lib/product-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "access-token" }) }),
}));

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  vi.unstubAllGlobals();
});

describe("vendor product data", () => {
  it("sends controlled URL state to the authenticated inventory endpoint", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      expect(request.headers.get("Authorization")).toBe("Bearer access-token");
      return Response.json({
        data: { items: [], meta: { limit: 25, page: 2, total: 0, totalPages: 1 } },
        message: "ok",
        success: true,
      });
    });
    vi.stubGlobal("fetch", fetch);

    await getVendorInventory({
      inStock: false,
      isActive: true,
      page: 2,
      pageSize: 25,
      search: "phone",
      sortBy: "basePrice",
      sortOrder: "asc",
    });

    const url = new URL((fetch.mock.calls[0]?.[0] as Request).url);
    expect(url.pathname).toBe("/api/v1/products/vendor");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      inStock: "false",
      isActive: "true",
      limit: "25",
      page: "2",
      search: "phone",
      sortBy: "basePrice",
      sortOrder: "asc",
    });
  });

  it("loads category options and the owned edit detail together", async () => {
    const productId = "11111111-1111-4111-8111-111111111111";
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const url = new URL((input as Request).url);
      return url.pathname.endsWith("/categories")
        ? Response.json({ data: [], message: "ok", success: true })
        : Response.json({ data: { id: productId, variants: [] }, message: "ok", success: true });
    });
    vi.stubGlobal("fetch", fetch);

    const result = await getProductFormData(productId);

    expect(result.product?.id).toBe(productId);
    expect(
      fetch.mock.calls.map(([input]) => new URL((input as Request).url).pathname).sort(),
    ).toEqual(["/api/v1/categories", `/api/v1/products/vendor/${productId}`]);
  });
});

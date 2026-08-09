import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVendorInventory } from "../src/lib/product-data";

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
});

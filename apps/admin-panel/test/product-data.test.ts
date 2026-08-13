import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminProduct, getAdminProducts, ProductDataError } from "../src/lib/product-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "admin-access-token" }) }),
}));

function envelope(data: unknown, status = 200, message = "ok") {
  return Response.json(
    status < 400 ? { data, message, success: true } : { message, success: false },
    { status },
  );
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  vi.unstubAllGlobals();
});

describe("admin product data", () => {
  it("passes server pagination, search, active, vendor, and category filters", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer admin-access-token");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        categoryId: "22222222-2222-4222-8222-222222222222",
        isActive: "false",
        limit: "50",
        page: "2",
        search: "linen",
        vendorId: "11111111-1111-4111-8111-111111111111",
      });
      return envelope({ items: [], meta: { limit: 50, page: 2, total: 0, totalPages: 1 } });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(
      getAdminProducts({
        categoryId: "22222222-2222-4222-8222-222222222222",
        page: 2,
        pageSize: 50,
        search: "linen",
        status: "inactive",
        vendorId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({ items: [] });
  });

  it("preserves not-found status from direct detail requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope(null, 404, "Product not found")),
    );
    await expect(getAdminProduct("11111111-1111-4111-8111-111111111111")).rejects.toEqual(
      expect.objectContaining<ProductDataError>({
        message: "Product not found",
        name: "ProductDataError",
        status: 404,
      }),
    );
  });
});

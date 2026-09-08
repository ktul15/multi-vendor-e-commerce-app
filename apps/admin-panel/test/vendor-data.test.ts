import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminVendor, getAdminVendors, VendorDataError } from "../src/lib/vendor-data";

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

describe("admin vendor data", () => {
  it("passes server pagination, search, and status to the list endpoint", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer admin-access-token");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        limit: "50",
        page: "2",
        search: "asha",
        status: "PENDING",
      });
      return envelope({ items: [], meta: { limit: 50, page: 2, total: 0, totalPages: 1 } });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(
      getAdminVendors({ page: 2, pageSize: 50, search: "asha", status: "PENDING" }),
    ).resolves.toMatchObject({ items: [] });
  });

  it("preserves not-found status from direct detail requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope(null, 404, "Vendor profile not found")),
    );
    await expect(getAdminVendor("11111111-1111-4111-8111-111111111111")).rejects.toEqual(
      expect.objectContaining<VendorDataError>({
        message: "Vendor profile not found",
        name: "VendorDataError",
        status: 404,
      }),
    );
  });
});

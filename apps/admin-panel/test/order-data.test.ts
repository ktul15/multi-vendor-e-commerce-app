import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOrder, getAdminOrders, OrderDataError } from "../src/lib/order-data";

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

describe("admin order data", () => {
  it("passes server pagination, search, status, identity, and date filters", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer admin-access-token");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        endDate: "2026-08-14T23:59:59.999Z",
        limit: "50",
        page: "2",
        search: "ORD-123",
        startDate: "2026-08-01T00:00:00.000Z",
        status: "PROCESSING",
        userId: "11111111-1111-4111-8111-111111111111",
        vendorId: "22222222-2222-4222-8222-222222222222",
      });
      return envelope({ items: [], meta: { limit: 50, page: 2, total: 0, totalPages: 1 } });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(
      getAdminOrders({
        endDate: "2026-08-14",
        page: 2,
        pageSize: 50,
        search: "ORD-123",
        startDate: "2026-08-01",
        status: "PROCESSING",
        userId: "11111111-1111-4111-8111-111111111111",
        vendorId: "22222222-2222-4222-8222-222222222222",
      }),
    ).resolves.toMatchObject({ items: [] });
  });

  it("preserves not-found status from direct detail requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope(null, 404, "Order not found")),
    );
    await expect(getAdminOrder("11111111-1111-4111-8111-111111111111")).rejects.toEqual(
      expect.objectContaining<OrderDataError>({
        message: "Order not found",
        name: "OrderDataError",
        status: 404,
      }),
    );
  });
});

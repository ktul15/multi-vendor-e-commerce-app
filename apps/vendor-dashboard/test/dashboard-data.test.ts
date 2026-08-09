import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVendorDashboardData } from "../src/lib/dashboard-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "access-token" }) }),
}));

const range = {
  endDate: "2026-08-10T00:00:00.000Z",
  period: "week" as const,
  range: "90d" as const,
  startDate: "2026-05-12T00:00:00.000Z",
};

function envelope(data: unknown, status = 200) {
  return Response.json(
    status < 400
      ? { data, message: "ok", success: true }
      : { message: "unavailable", success: false },
    { status },
  );
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  vi.unstubAllGlobals();
});

describe("vendor dashboard data", () => {
  it("queries all dashboard endpoints with shared date state and preserves partial results", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer access-token");
      if (url.pathname.endsWith("/summary")) {
        return envelope({
          dateRange: { endDate: range.endDate, startDate: range.startDate },
          orders: { billableOrders: 2, byStatus: { DELIVERED: 2 }, totalOrders: 2 },
          revenue: { commission: "100.00", gross: "1000.00", net: "900.00" },
        });
      }
      if (url.pathname.endsWith("/sales")) return envelope(null, 503);
      return envelope({ items: [], meta: { limit: 5, page: 1, total: 0, totalPages: 1 } });
    });
    vi.stubGlobal("fetch", fetch);

    const data = await getVendorDashboardData(range);

    expect(data.summary.status).toBe("success");
    expect(data.sales).toEqual({ message: "Sales history could not be loaded.", status: "error" });
    expect(data.orders.status).toBe("success");
    const urls = fetch.mock.calls.map(([input]) => new URL((input as Request).url));
    expect(
      urls.find((url) => url.pathname.endsWith("/summary"))?.searchParams.get("startDate"),
    ).toBe(range.startDate);
    expect(urls.find((url) => url.pathname.endsWith("/sales"))?.searchParams.get("period")).toBe(
      "week",
    );
    expect(urls.find((url) => url.pathname.endsWith("/vendor"))?.search).toBe("?limit=5&page=1");
  });
});

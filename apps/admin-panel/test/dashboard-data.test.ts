import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminDashboardData } from "../src/lib/dashboard-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "admin-access-token" }) }),
}));

const range = {
  endDate: "2026-08-14T00:00:00.000Z",
  period: "week" as const,
  range: "90d" as const,
  startDate: "2026-05-16T00:00:00.000Z",
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

describe("admin dashboard data", () => {
  it("queries every overview endpoint and preserves successful sections", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer admin-access-token");
      if (url.pathname.endsWith("/dashboard")) {
        return envelope({
          bannedUsers: 2,
          pendingVendors: 3,
          platformRevenue: "5000.00",
          totalOrders: 20,
          totalProducts: 12,
          totalUsers: 10,
          totalVendors: 4,
        });
      }
      if (url.pathname.endsWith("/revenue")) return envelope(null, 503);
      return envelope({ items: [], meta: { limit: 5, page: 1, total: 0, totalPages: 1 } });
    });
    vi.stubGlobal("fetch", fetch);

    const data = await getAdminDashboardData(range);

    expect(data.summary.status).toBe("success");
    expect(data.revenue).toEqual({
      message: "Gross merchandise value could not be loaded.",
      status: "error",
    });
    expect(data.orders.status).toBe("success");
    const urls = fetch.mock.calls.map(([input]) => new URL((input as Request).url));
    const revenueUrl = urls.find((url) => url.pathname.endsWith("/revenue"));
    expect(revenueUrl?.searchParams.get("period")).toBe("week");
    expect(revenueUrl?.searchParams.get("startDate")).toBe(range.startDate);
    expect(revenueUrl?.searchParams.get("endDate")).toBe(range.endDate);
    expect(urls.find((url) => url.pathname.endsWith("/orders"))?.search).toBe("?limit=5&page=1");
  });
});

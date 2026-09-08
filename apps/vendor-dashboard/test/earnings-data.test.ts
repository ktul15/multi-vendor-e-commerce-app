import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVendorEarningsData } from "../src/lib/earnings-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "access-token" }) }),
}));

const range = {
  endDate: "2026-08-11T00:00:00.000Z",
  period: "week" as const,
  range: "90d" as const,
  startDate: "2026-05-13T00:00:00.000Z",
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

describe("vendor earnings data", () => {
  it("queries authoritative reporting endpoints with the selected range and preserves partial results", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer access-token");
      if (url.pathname.endsWith("/analytics/vendor/summary")) {
        return envelope({
          dateRange: { endDate: range.endDate, startDate: range.startDate },
          orders: { billableOrders: 2, byStatus: {}, totalOrders: 2 },
          revenue: { commission: "101.25", gross: "1000.00", net: "898.75" },
        });
      }
      if (url.pathname.endsWith("/analytics/vendor/sales")) return envelope(null, 503);
      if (url.pathname.endsWith("/analytics/vendor/top-products")) {
        return envelope({ dateRange: range, products: [] });
      }
      if (url.pathname.endsWith("/earnings/summary")) {
        const zero = { commissionAmount: 0, count: 0, grossAmount: 0, netAmount: 0 };
        return envelope({ failed: zero, pending: zero, reversed: zero, transferred: zero });
      }
      if (url.pathname.endsWith("/vendor-payouts/earnings")) {
        return envelope({
          earnings: [],
          pagination: { limit: 10, page: 1, total: 0, totalPages: 0 },
        });
      }
      if (url.pathname.endsWith("/vendor-payouts/payouts")) {
        return envelope({
          pagination: { limit: 10, page: 1, total: 0, totalPages: 0 },
          payouts: [],
        });
      }
      return envelope({
        chargesEnabled: true,
        detailsSubmitted: true,
        onboardingStatus: "COMPLETE",
        payoutsEnabled: true,
      });
    });
    vi.stubGlobal("fetch", fetch);

    const data = await getVendorEarningsData(range, { earningsPage: 3, payoutPage: 2 });

    expect(data.summary.status).toBe("success");
    expect(data.sales).toEqual({
      message: "Revenue history could not be loaded.",
      status: "error",
    });
    expect(data.payouts.status).toBe("success");
    const urls = fetch.mock.calls.map(([input]) => new URL((input as Request).url));
    expect(urls).toHaveLength(7);
    expect(
      urls.find((url) => url.pathname.endsWith("/top-products"))?.searchParams.get("limit"),
    ).toBe("10");
    expect(urls.find((url) => url.pathname.endsWith("/sales"))?.searchParams.get("period")).toBe(
      "week",
    );
    expect(
      urls
        .find((url) => url.pathname.endsWith("/vendor-payouts/earnings"))
        ?.searchParams.get("startDate"),
    ).toBe(range.startDate);
    expect(
      urls
        .find((url) => url.pathname.endsWith("/vendor-payouts/earnings"))
        ?.searchParams.get("page"),
    ).toBe("3");
    expect(
      urls
        .find((url) => url.pathname.endsWith("/vendor-payouts/payouts"))
        ?.searchParams.get("page"),
    ).toBe("2");
  });
});

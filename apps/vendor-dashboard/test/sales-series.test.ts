import { describe, expect, it } from "vitest";
import { fillMissingSalesBuckets } from "../src/lib/sales-series";

describe("sales chart timeline", () => {
  it("fills missing daily buckets with zero revenue", () => {
    expect(
      fillMissingSalesBuckets({
        dateRange: {
          endDate: "2026-08-10T00:00:00.000Z",
          startDate: "2026-08-07T00:00:00.000Z",
        },
        period: "day",
        series: [
          { orderCount: 1, periodStart: "2026-08-07", revenue: "100.00" },
          { orderCount: 2, periodStart: "2026-08-09", revenue: "250.00" },
        ],
      }),
    ).toEqual([
      { orderCount: 1, periodStart: "2026-08-07", revenue: "100.00" },
      { orderCount: 0, periodStart: "2026-08-08", revenue: "0.00" },
      { orderCount: 2, periodStart: "2026-08-09", revenue: "250.00" },
    ]);
  });

  it("aligns weekly and monthly ranges to backend DATE_TRUNC boundaries", () => {
    expect(
      fillMissingSalesBuckets({
        dateRange: {
          endDate: "2026-08-10T00:00:00.000Z",
          startDate: "2026-07-11T00:00:00.000Z",
        },
        period: "week",
        series: [],
      }).map((bucket) => bucket.periodStart),
    ).toEqual(["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03"]);

    expect(
      fillMissingSalesBuckets({
        dateRange: {
          endDate: "2026-08-10T00:00:00.000Z",
          startDate: "2026-05-12T00:00:00.000Z",
        },
        period: "month",
        series: [],
      }).map((bucket) => bucket.periodStart),
    ).toEqual(["2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"]);
  });
});

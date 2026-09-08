import { describe, expect, it } from "vitest";
import { fillMissingRevenueBuckets } from "../src/lib/revenue-series";

describe("admin revenue series", () => {
  it("fills missing daily buckets with zeroes", () => {
    expect(
      fillMissingRevenueBuckets({
        dateRange: {
          endDate: "2026-08-11T00:00:00.000Z",
          startDate: "2026-08-08T00:00:00.000Z",
        },
        period: "day",
        series: [
          { orderCount: 2, periodStart: "2026-08-08", revenue: "100.00" },
          { orderCount: 1, periodStart: "2026-08-10", revenue: "50.00" },
        ],
      }),
    ).toEqual([
      { orderCount: 2, periodStart: "2026-08-08", revenue: "100.00" },
      { orderCount: 0, periodStart: "2026-08-09", revenue: "0.00" },
      { orderCount: 1, periodStart: "2026-08-10", revenue: "50.00" },
    ]);
  });

  it("aligns weekly buckets to PostgreSQL's Monday boundary", () => {
    expect(
      fillMissingRevenueBuckets({
        dateRange: {
          endDate: "2026-08-18T00:00:00.000Z",
          startDate: "2026-08-05T00:00:00.000Z",
        },
        period: "week",
        series: [{ orderCount: 1, periodStart: "2026-08-10", revenue: "75.00" }],
      }).map((point) => point.periodStart),
    ).toEqual(["2026-08-03", "2026-08-10", "2026-08-17"]);
  });

  it("returns the backend series unchanged for an invalid range", () => {
    const series = [{ orderCount: 1, periodStart: "2026-08-10", revenue: "75.00" }];
    expect(
      fillMissingRevenueBuckets({
        dateRange: { endDate: "invalid", startDate: "invalid" },
        period: "month",
        series,
      }),
    ).toBe(series);
  });
});

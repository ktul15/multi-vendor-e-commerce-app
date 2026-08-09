import { describe, expect, it } from "vitest";
import {
  dashboardRangeHref,
  parseDashboardRange,
  salesPeriodHref,
} from "../src/lib/dashboard-range";

describe("dashboard URL date range", () => {
  const now = new Date("2026-08-09T10:00:00.000Z");

  it("uses a URL-safe 30-day default ending at the next UTC midnight", () => {
    expect(parseDashboardRange({}, now)).toEqual({
      endDate: "2026-08-10T00:00:00.000Z",
      period: "day",
      range: "30d",
      startDate: "2026-07-11T00:00:00.000Z",
    });
  });

  it("accepts valid range and grouping values and rejects unknown values", () => {
    expect(parseDashboardRange({ period: "month", range: "1y" }, now)).toMatchObject({
      period: "month",
      range: "1y",
      startDate: "2025-08-10T00:00:00.000Z",
    });
    expect(parseDashboardRange({ period: "hour", range: "forever" }, now)).toMatchObject({
      period: "day",
      range: "30d",
    });
  });

  it("serializes controls deterministically", () => {
    expect(dashboardRangeHref("90d")).toBe("/?period=week&range=90d");
    expect(salesPeriodHref("90d", "month")).toBe("/?period=month&range=90d");
  });
});

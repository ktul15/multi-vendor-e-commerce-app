import { describe, expect, it } from "vitest";
import {
  dashboardRangeHref,
  parseDashboardRange,
  revenuePeriodHref,
} from "../src/lib/dashboard-range";

describe("admin dashboard range", () => {
  const now = new Date("2026-08-13T10:00:00.000Z");

  it("defaults to the last 30 days grouped daily", () => {
    expect(parseDashboardRange({}, now)).toEqual({
      endDate: "2026-08-14T00:00:00.000Z",
      period: "day",
      range: "30d",
      startDate: "2026-07-15T00:00:00.000Z",
    });
  });

  it("uses safe defaults for unsupported query values", () => {
    expect(parseDashboardRange({ period: "year", range: "all" }, now).range).toBe("30d");
    expect(parseDashboardRange({ period: "year", range: "all" }, now).period).toBe("day");
  });

  it("chooses a useful default grouping for each range and builds stable links", () => {
    expect(parseDashboardRange({ range: "90d" }, now).period).toBe("week");
    expect(parseDashboardRange({ range: "1y" }, now).period).toBe("month");
    expect(dashboardRangeHref("90d")).toBe("/?period=week&range=90d");
    expect(revenuePeriodHref("90d", "month")).toBe("/?period=month&range=90d");
  });
});

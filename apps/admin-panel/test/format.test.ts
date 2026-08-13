import { describe, expect, it } from "vitest";
import { formatCompactInr, formatCount, formatDashboardDate, formatInr } from "../src/lib/format";

describe("admin dashboard formatting", () => {
  it("formats money and counts for the Indian locale", () => {
    expect(formatInr("125000.5")).toBe("₹1,25,000.50");
    expect(formatCompactInr(125000)).toBe("₹1.3L");
    expect(formatCount(125000)).toBe("1,25,000");
  });

  it("formats dashboard dates deterministically in UTC", () => {
    expect(formatDashboardDate("2026-08-09T23:30:00-05:00")).toBe("10 Aug 2026");
    expect(formatDashboardDate("not-a-date")).toBe("Date unavailable");
  });

  it("falls back safely for invalid monetary values", () => {
    expect(formatInr("unknown")).toBe("₹0.00");
  });
});

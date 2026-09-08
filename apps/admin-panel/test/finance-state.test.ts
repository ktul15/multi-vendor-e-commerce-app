import { describe, expect, it } from "vitest";
import { financeHref, parseFinanceState } from "../src/lib/finance-state";

const now = new Date("2026-08-15T10:00:00.000Z");
describe("finance date state", () => {
  it("maps presets to UTC server ranges and appropriate grouping", () => {
    expect(parseFinanceState({ range: "7d" }, now)).toMatchObject({
      endDate: "2026-08-16T00:00:00.000Z",
      endInput: "2026-08-15",
      period: "day",
      range: "7d",
      startDate: "2026-08-09T00:00:00.000Z",
    });
    expect(financeHref("90d")).toBe("/finance?period=week&range=90d");
  });
  it("makes a custom end date inclusive and rejects unordered or oversized ranges", () => {
    expect(
      parseFinanceState(
        { endDate: "2026-08-15", period: "week", range: "custom", startDate: "2026-08-01" },
        now,
      ),
    ).toMatchObject({
      endDate: "2026-08-16T00:00:00.000Z",
      period: "week",
      range: "custom",
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(
      parseFinanceState({ endDate: "2026-08-01", range: "custom", startDate: "2026-08-15" }, now)
        .validationError,
    ).toMatch(/ordered date range/);
    expect(
      parseFinanceState({ endDate: "2026-01-01", range: "custom", startDate: "2025-01-01" }, now),
    ).toMatchObject({
      endDate: "2026-01-02T00:00:00.000Z",
      startDate: "2025-01-01T00:00:00.000Z",
    });
    expect(
      parseFinanceState({ endDate: "2025-01-01", range: "custom", startDate: "2024-01-01" }, now)
        .validationError,
    ).toMatch(/366 days or fewer/);
    expect(
      parseFinanceState({ endDate: "2026-02-31", range: "custom", startDate: "2026-02-01" }, now)
        .validationError,
    ).toMatch(/ordered date range/);
    expect(
      parseFinanceState({ endDate: "2026-02-28", range: "custom", startDate: "not-a-date" }, now)
        .validationError,
    ).toMatch(/ordered date range/);
  });
});

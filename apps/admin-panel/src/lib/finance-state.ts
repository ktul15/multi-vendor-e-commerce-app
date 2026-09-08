import type { RevenuePeriod } from "./dashboard-range";
import { revenuePeriods } from "./dashboard-range";

export const financeRanges = ["7d", "30d", "90d", "1y"] as const;
export type FinanceRange = (typeof financeRanges)[number] | "custom";
export type FinanceSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;
export type FinanceState = Readonly<{
  endDate: string;
  endInput: string;
  period: RevenuePeriod;
  range: FinanceRange;
  startDate: string;
  startInput: string;
  validationError?: string;
}>;

const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as const;
const periods: Record<Exclude<FinanceRange, "custom">, RevenuePeriod> = {
  "7d": "day",
  "30d": "day",
  "90d": "week",
  "1y": "month",
};
const first = (value: string | readonly string[] | undefined) =>
  typeof value === "string" ? value : value?.[0];
const dateInput = (date: Date) => date.toISOString().slice(0, 10);
const validDateInput = (value: string, date: Date) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && dateInput(date) === value;
const validPeriod = (value?: string): value is RevenuePeriod =>
  revenuePeriods.some((period) => period === value);

export function parseFinanceState(params: FinanceSearchParams, now = new Date()): FinanceState {
  const requestedRange = first(params.range);
  const end = new Date(now);
  end.setUTCHours(24, 0, 0, 0);
  const preset = financeRanges.some((range) => range === requestedRange)
    ? (requestedRange as Exclude<FinanceRange, "custom">)
    : "30d";
  const start = new Date(end.getTime() - days[preset] * 86_400_000);
  const requestedPeriod = first(params.period);
  const period = validPeriod(requestedPeriod) ? requestedPeriod : periods[preset];
  if (requestedRange !== "custom")
    return {
      endDate: end.toISOString(),
      endInput: dateInput(new Date(end.getTime() - 86_400_000)),
      period,
      range: preset,
      startDate: start.toISOString(),
      startInput: dateInput(start),
    };

  const startInput = first(params.startDate) ?? "";
  const endInput = first(params.endDate) ?? "";
  const customStart = new Date(`${startInput}T00:00:00.000Z`);
  const customEndInclusive = new Date(`${endInput}T00:00:00.000Z`);
  const difference = customEndInclusive.getTime() - customStart.getTime();
  if (
    !validDateInput(startInput, customStart) ||
    !validDateInput(endInput, customEndInclusive) ||
    Number.isNaN(difference) ||
    difference < 0 ||
    difference > 365 * 86_400_000
  ) {
    return {
      endDate: end.toISOString(),
      endInput,
      period,
      range: "custom",
      startDate: start.toISOString(),
      startInput,
      validationError: "Choose an ordered date range of 366 days or fewer.",
    };
  }
  const customEndExclusive = new Date(customEndInclusive.getTime() + 86_400_000);
  return {
    endDate: customEndExclusive.toISOString(),
    endInput,
    period,
    range: "custom",
    startDate: customStart.toISOString(),
    startInput,
  };
}

export function financeHref(range: Exclude<FinanceRange, "custom">, period = periods[range]) {
  return `/finance?${new URLSearchParams({ period, range }).toString()}`;
}

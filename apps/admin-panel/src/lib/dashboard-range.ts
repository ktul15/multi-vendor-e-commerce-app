export const dashboardRanges = ["7d", "30d", "90d", "1y"] as const;
export const revenuePeriods = ["day", "week", "month"] as const;

export type DashboardRange = (typeof dashboardRanges)[number];
export type RevenuePeriod = (typeof revenuePeriods)[number];

export type DashboardRangeState = Readonly<{
  endDate: string;
  period: RevenuePeriod;
  range: DashboardRange;
  startDate: string;
}>;

const rangeDays: Record<DashboardRange, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
const defaultPeriods: Record<DashboardRange, RevenuePeriod> = {
  "7d": "day",
  "30d": "day",
  "90d": "week",
  "1y": "month",
};

type SearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

function includes<const T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return value !== undefined && values.some((candidate) => candidate === value);
}

export function parseDashboardRange(
  searchParams: SearchParams,
  now = new Date(),
): DashboardRangeState {
  const rawRange = first(searchParams.range);
  const range = includes(dashboardRanges, rawRange) ? rawRange : "30d";
  const rawPeriod = first(searchParams.period);
  const period = includes(revenuePeriods, rawPeriod) ? rawPeriod : defaultPeriods[range];
  const end = new Date(now);
  end.setUTCHours(24, 0, 0, 0);
  const start = new Date(end.getTime() - rangeDays[range] * 24 * 60 * 60 * 1000);

  return { endDate: end.toISOString(), period, range, startDate: start.toISOString() };
}

export function dashboardRangeHref(range: DashboardRange): string {
  return `/?${new URLSearchParams({ period: defaultPeriods[range], range }).toString()}`;
}

export function revenuePeriodHref(range: DashboardRange, period: RevenuePeriod): string {
  return `/?${new URLSearchParams({ period, range }).toString()}`;
}

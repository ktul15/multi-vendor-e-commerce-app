import type { AdminRevenue } from "./dashboard-data";

type RevenueBucket = AdminRevenue["series"][number];

function bucketStart(value: string, period: AdminRevenue["period"]): Date {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  if (period === "week") {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  } else if (period === "month") {
    date.setUTCDate(1);
  }
  return date;
}

function nextBucket(date: Date, period: AdminRevenue["period"]): Date {
  const next = new Date(date);
  if (period === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (period === "week") next.setUTCDate(next.getUTCDate() + 7);
  if (period === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fillMissingRevenueBuckets(revenue: AdminRevenue): readonly RevenueBucket[] {
  const start = bucketStart(revenue.dateRange.startDate, revenue.period);
  const end = new Date(revenue.dateRange.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return revenue.series;
  }

  const buckets = new Map(revenue.series.map((point) => [point.periodStart, point]));
  const complete: RevenueBucket[] = [];
  for (let cursor = start; cursor < end; cursor = nextBucket(cursor, revenue.period)) {
    const periodStart = dateKey(cursor);
    complete.push(
      buckets.get(periodStart) ?? {
        orderCount: 0,
        periodStart,
        revenue: "0.00",
      },
    );
  }
  return complete;
}

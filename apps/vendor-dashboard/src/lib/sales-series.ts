import type { VendorSales } from "./dashboard-data";
import type { SalesPeriod } from "./dashboard-range";

type SalesBucket = VendorSales["series"][number];

function floorPeriod(date: Date, period: SalesPeriod): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  if (period === "week") {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  } else if (period === "month") {
    start.setUTCDate(1);
  }
  return start;
}

function nextPeriod(date: Date, period: SalesPeriod): Date {
  const next = new Date(date);
  if (period === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (period === "week") next.setUTCDate(next.getUTCDate() + 7);
  if (period === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export function fillMissingSalesBuckets(sales: VendorSales): readonly SalesBucket[] {
  const buckets = new Map(sales.series.map((bucket) => [bucket.periodStart, bucket]));
  const end = new Date(sales.dateRange.endDate);
  let cursor = floorPeriod(new Date(sales.dateRange.startDate), sales.period);
  const series: SalesBucket[] = [];

  while (cursor < end) {
    const periodStart = cursor.toISOString().slice(0, 10);
    series.push(buckets.get(periodStart) ?? { orderCount: 0, periodStart, revenue: "0.00" });
    cursor = nextPeriod(cursor, sales.period);
  }
  return series;
}

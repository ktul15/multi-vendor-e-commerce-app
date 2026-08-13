const inr = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  minimumFractionDigits: 2,
  style: "currency",
});

const compactInr = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const dashboardDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function formatInr(value: number | string): string {
  const amount = Number(value);
  return inr.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCompactInr(value: number | string): string {
  const amount = Number(value);
  return compactInr.format(Number.isFinite(amount) ? amount : 0);
}

export function formatDashboardDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : dashboardDate.format(date);
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

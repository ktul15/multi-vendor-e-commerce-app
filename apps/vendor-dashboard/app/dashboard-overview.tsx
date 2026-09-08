import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState } from "@repo/ui";
import Link from "next/link";
import type {
  VendorDashboardData,
  VendorOrders,
  VendorSales,
  VendorSummary,
} from "../src/lib/dashboard-data";
import {
  dashboardRangeHref,
  dashboardRanges,
  salesPeriodHref,
  salesPeriods,
} from "../src/lib/dashboard-range";
import type { DashboardRangeState, SalesPeriod } from "../src/lib/dashboard-range";
import { fillMissingSalesBuckets } from "../src/lib/sales-series";
import { DashboardRefreshButton } from "./dashboard-refresh-button";

const currency = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  minimumFractionDigits: 2,
  style: "currency",
});
const compactCurrency = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  notation: "compact",
  style: "currency",
});
const date = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const rangeLabels = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" } as const;
const periodLabels: Record<SalesPeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

function formatMoney(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? currency.format(amount) : currency.format(0);
}

function SummaryMetrics({ summary }: Readonly<{ summary: VendorSummary }>) {
  const metrics = [
    {
      detail: `${summary.orders.billableOrders} billable`,
      label: "Total orders",
      value: summary.orders.totalOrders.toLocaleString("en-IN"),
    },
    {
      detail: "Before commission",
      label: "Gross revenue",
      value: formatMoney(summary.revenue.gross),
    },
    { detail: "Vendor earnings", label: "Net earnings", value: formatMoney(summary.revenue.net) },
    {
      detail: "Marketplace share",
      label: "Commission paid",
      value: formatMoney(summary.revenue.commission),
    },
  ];
  return (
    <section aria-label="Dashboard summary" className="vendor-overview__metrics">
      {metrics.map((metric) => (
        <Card className="vendor-metric" key={metric.label}>
          <CardContent>
            <p className="vendor-metric__label">{metric.label}</p>
            <p className="vendor-metric__value">{metric.value}</p>
            <p className="vendor-metric__detail">{metric.detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function RevenueChart({ sales }: Readonly<{ sales: VendorSales }>) {
  if (sales.series.length === 0) {
    return (
      <EmptyState description="Completed sales will appear here." title="No sales in this period" />
    );
  }
  const series = fillMissingSalesBuckets(sales);
  const values = series.map((point) => Number(point.revenue));
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = series.length === 1 ? 50 : 5 + (index / (series.length - 1)) * 90;
      const y = 92 - (Math.max(0, value) / max) * 80;
      return `${x},${y}`;
    })
    .join(" ");
  const labelIndexes = [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])];

  return (
    <div className="vendor-chart">
      <div className="vendor-chart__scale" aria-hidden="true">
        <span>{compactCurrency.format(max)}</span>
        <span>{compactCurrency.format(max / 2)}</span>
        <span>{currency.format(0)}</span>
      </div>
      <svg
        aria-labelledby="sales-chart-title sales-chart-description"
        role="img"
        viewBox="0 0 100 100"
      >
        <title id="sales-chart-title">Revenue over time</title>
        <desc id="sales-chart-description">
          {series.length} sales periods, with a maximum revenue of {currency.format(max)}.
        </desc>
        <line className="vendor-chart__grid" x1="5" x2="95" y1="12" y2="12" />
        <line className="vendor-chart__grid" x1="5" x2="95" y1="52" y2="52" />
        <line className="vendor-chart__grid" x1="5" x2="95" y1="92" y2="92" />
        <polyline className="vendor-chart__area" points={`5,92 ${points} 95,92`} />
        <polyline className="vendor-chart__line" points={points} />
        {series.map((point, index) => {
          const [x, y] = points.split(" ")[index]!.split(",");
          return (
            <circle className="vendor-chart__point" cx={x} cy={y} key={point.periodStart} r="1.5">
              <title>{`${point.periodStart}: ${formatMoney(point.revenue)}, ${point.orderCount} orders`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="vendor-chart__dates" aria-hidden="true">
        {labelIndexes.map((index) => (
          <span key={index}>{date.format(new Date(series[index]!.periodStart))}</span>
        ))}
      </div>
      <ul className="ui-visually-hidden">
        {series.map((point) => (
          <li
            key={point.periodStart}
          >{`${point.periodStart}: ${formatMoney(point.revenue)}, ${point.orderCount} orders`}</li>
        ))}
      </ul>
    </div>
  );
}

function statusTone(status: VendorOrders["items"][number]["status"]) {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED" || status === "REFUNDED") return "danger";
  if (status === "PENDING") return "warning";
  return "info";
}

function RecentOrders({ orders }: Readonly<{ orders: VendorOrders }>) {
  if (orders.items.length === 0) {
    return <EmptyState description="New customer orders will appear here." title="No orders yet" />;
  }
  return (
    <div
      aria-label="Recent orders table"
      className="vendor-orders-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="vendor-orders-table">
        <caption className="ui-visually-hidden">Five most recent vendor orders</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Status</th>
            <th scope="col">Total</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.items.map((order) => (
            <tr key={order.id}>
              <th scope="row">{order.order.orderNumber}</th>
              <td>{order.order.user.name}</td>
              <td>
                <Badge tone={statusTone(order.status)}>{order.status}</Badge>
              </td>
              <td>{formatMoney(order.subtotal)}</td>
              <td>
                <time dateTime={order.order.createdAt}>
                  {date.format(new Date(order.order.createdAt))}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardOverview({
  data,
  range,
}: Readonly<{ data: VendorDashboardData; range: DashboardRangeState }>) {
  const failures = [data.summary, data.sales, data.orders].filter(
    (section) => section.status === "error",
  ).length;
  return (
    <div className="vendor-overview">
      <header className="vendor-overview__header">
        <div>
          <p className="vendor-overview__eyebrow">Store performance</p>
          <h1>Dashboard</h1>
          <p>Revenue and order activity for the selected period.</p>
        </div>
        <nav aria-label="Dashboard date range" className="vendor-overview__range">
          {dashboardRanges.map((option) => (
            <Link
              aria-current={range.range === option ? "page" : undefined}
              href={dashboardRangeHref(option)}
              key={option}
            >
              {rangeLabels[option]}
            </Link>
          ))}
        </nav>
      </header>
      {failures > 0 && failures < 3 ? (
        <div className="vendor-overview__partial" role="status">
          <span>Some dashboard sections could not be loaded.</span>
          <DashboardRefreshButton />
        </div>
      ) : null}
      {data.summary.status === "success" ? (
        <SummaryMetrics summary={data.summary.data} />
      ) : (
        <ErrorState
          action={<DashboardRefreshButton />}
          description={data.summary.message}
          title="Summary unavailable"
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Sales revenue</CardTitle>
          <nav aria-label="Sales grouping" className="vendor-overview__period">
            {salesPeriods.map((period) => (
              <Link
                aria-current={range.period === period ? "page" : undefined}
                href={salesPeriodHref(range.range, period)}
                key={period}
              >
                {periodLabels[period]}
              </Link>
            ))}
          </nav>
        </CardHeader>
        <CardContent>
          {data.sales.status === "success" ? (
            <RevenueChart sales={data.sales.data} />
          ) : (
            <ErrorState
              action={<DashboardRefreshButton />}
              description={data.sales.message}
              title="Sales unavailable"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <Link href="/orders">View all orders</Link>
        </CardHeader>
        <CardContent>
          {data.orders.status === "success" ? (
            <RecentOrders orders={data.orders.data} />
          ) : (
            <ErrorState
              action={<DashboardRefreshButton />}
              description={data.orders.message}
              title="Orders unavailable"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

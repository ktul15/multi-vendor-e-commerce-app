import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState } from "@repo/ui";
import Link from "next/link";
import type {
  AdminDashboardData,
  AdminOrders,
  AdminRevenue,
  AdminSummary,
} from "../src/lib/dashboard-data";
import {
  dashboardRangeHref,
  dashboardRanges,
  revenuePeriodHref,
  revenuePeriods,
} from "../src/lib/dashboard-range";
import type { DashboardRangeState, RevenuePeriod } from "../src/lib/dashboard-range";
import { formatCompactInr, formatCount, formatDashboardDate, formatInr } from "../src/lib/format";
import { fillMissingRevenueBuckets } from "../src/lib/revenue-series";
import { DashboardRefreshButton } from "./dashboard-refresh-button";

const rangeLabels = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" } as const;
const periodLabels: Record<RevenuePeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

function SummaryMetrics({ summary }: Readonly<{ summary: AdminSummary }>) {
  const metrics = [
    {
      detail: `${formatCount(summary.bannedUsers)} banned`,
      href: "/users",
      label: "Total users",
      value: formatCount(summary.totalUsers),
    },
    {
      detail: `${formatCount(summary.pendingVendors)} pending review`,
      href: "/vendors",
      label: "Vendors",
      value: formatCount(summary.totalVendors),
    },
    {
      detail: "Customer orders across all stores",
      href: "/orders",
      label: "Total orders",
      value: formatCount(summary.totalOrders),
    },
    {
      detail: "Catalog across the marketplace",
      href: "/products",
      label: "Total products",
      value: formatCount(summary.totalProducts),
    },
    {
      detail: "Earned marketplace commission",
      href: "/finance",
      label: "Platform revenue",
      value: formatInr(summary.platformRevenue),
    },
  ];

  return (
    <section aria-label="Platform summary" className="admin-overview__metrics">
      {metrics.map((metric) => (
        <Card className="admin-metric" key={metric.label}>
          <CardContent>
            <p className="admin-metric__label">{metric.label}</p>
            <p className="admin-metric__value">{metric.value}</p>
            <Link className="admin-metric__detail" href={metric.href}>
              {metric.detail}
            </Link>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function RevenueChart({ revenue }: Readonly<{ revenue: AdminRevenue }>) {
  if (revenue.series.length === 0) {
    return (
      <EmptyState
        description="Billable marketplace orders will appear here."
        title="No GMV in this period"
      />
    );
  }

  const series = fillMissingRevenueBuckets(revenue);
  const values = series.map((point) => Math.max(0, Number(point.revenue) || 0));
  const maximum = Math.max(...values);
  const denominator = maximum || 1;
  const points = values
    .map((value, index) => {
      const x = series.length === 1 ? 50 : 5 + (index / (series.length - 1)) * 90;
      const y = 92 - (value / denominator) * 80;
      return `${x},${y}`;
    })
    .join(" ");
  const labelIndexes = [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])];

  return (
    <div className="admin-chart">
      <div aria-hidden="true" className="admin-chart__scale">
        <span>{formatCompactInr(maximum)}</span>
        <span>{formatCompactInr(maximum / 2)}</span>
        <span>{formatInr(0)}</span>
      </div>
      <svg aria-labelledby="gmv-chart-title gmv-chart-description" role="img" viewBox="0 0 100 100">
        <title id="gmv-chart-title">Gross merchandise value over time</title>
        <desc id="gmv-chart-description">
          {series.length} reporting periods, with a maximum gross merchandise value of{" "}
          {formatInr(maximum)}.
        </desc>
        <line className="admin-chart__grid" x1="5" x2="95" y1="12" y2="12" />
        <line className="admin-chart__grid" x1="5" x2="95" y1="52" y2="52" />
        <line className="admin-chart__grid" x1="5" x2="95" y1="92" y2="92" />
        <polyline className="admin-chart__area" points={`5,92 ${points} 95,92`} />
        <polyline className="admin-chart__line" points={points} />
        {series.map((point, index) => {
          const [x, y] = points.split(" ")[index]!.split(",");
          return (
            <circle className="admin-chart__point" cx={x} cy={y} key={point.periodStart} r="1.5">
              <title>{`${formatDashboardDate(point.periodStart)}: ${formatInr(point.revenue)}, ${formatCount(point.orderCount)} orders`}</title>
            </circle>
          );
        })}
      </svg>
      <div aria-hidden="true" className="admin-chart__dates">
        {labelIndexes.map((index) => (
          <span key={index}>{formatDashboardDate(series[index]!.periodStart)}</span>
        ))}
      </div>
      <ul className="ui-visually-hidden">
        {series.map((point) => (
          <li key={point.periodStart}>
            {`${formatDashboardDate(point.periodStart)}: ${formatInr(point.revenue)}, ${formatCount(point.orderCount)} orders`}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Order = AdminOrders["items"][number];

function orderStatus(order: Order): string {
  if (order.fulfillmentStatus.kind === "MIXED") return "MIXED";
  return order.fulfillmentStatus.status ?? "UNASSIGNED";
}

function statusTone(status: string) {
  if (status === "DELIVERED") return "success" as const;
  if (status === "CANCELLED" || status === "REFUNDED") return "danger" as const;
  if (status === "PENDING" || status === "UNASSIGNED") return "warning" as const;
  return "info" as const;
}

function RecentOrders({ orders }: Readonly<{ orders: AdminOrders }>) {
  if (orders.items.length === 0) {
    return (
      <EmptyState
        description="New customer orders across the marketplace will appear here."
        title="No orders yet"
      />
    );
  }

  return (
    <div
      aria-label="Recent platform orders"
      className="admin-orders-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="admin-orders-table">
        <caption className="ui-visually-hidden">Five most recent platform orders</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Store</th>
            <th scope="col">Status</th>
            <th scope="col">Total</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.items.map((order) => {
            const status = orderStatus(order);
            const stores = [
              ...new Set(
                order.vendorOrders.map(
                  (vendorOrder) =>
                    vendorOrder.vendor.vendorProfile?.storeName ?? "Store unavailable",
                ),
              ),
            ].join(", ");
            return (
              <tr key={order.id}>
                <th scope="row">{order.orderNumber}</th>
                <td>{order.user.name}</td>
                <td>{stores || "Unassigned"}</td>
                <td>
                  <Badge tone={statusTone(status)}>{status}</Badge>
                </td>
                <td>{formatInr(order.total)}</td>
                <td>
                  <time dateTime={order.createdAt}>{formatDashboardDate(order.createdAt)}</time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardOverview({
  data,
  range,
}: Readonly<{ data: AdminDashboardData; range: DashboardRangeState }>) {
  const failures = [data.summary, data.revenue, data.orders].filter(
    (section) => section.status === "error",
  ).length;

  return (
    <div className="admin-overview">
      <header className="admin-overview__header">
        <div>
          <p className="admin-overview__eyebrow">Marketplace operations</p>
          <h1>Overview</h1>
          <p>Platform health, gross merchandise value, and recent order activity.</p>
        </div>
        <nav aria-label="Dashboard date range" className="admin-overview__range">
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
        <div className="admin-overview__partial" role="status">
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
          <div>
            <CardTitle>Gross merchandise value</CardTitle>
            <p className="admin-overview__card-description">
              Gross order value before marketplace commission.
            </p>
          </div>
          <nav aria-label="GMV grouping" className="admin-overview__period">
            {revenuePeriods.map((period) => (
              <Link
                aria-current={range.period === period ? "page" : undefined}
                href={revenuePeriodHref(range.range, period)}
                key={period}
              >
                {periodLabels[period]}
              </Link>
            ))}
          </nav>
        </CardHeader>
        <CardContent>
          {data.revenue.status === "success" ? (
            <RevenueChart revenue={data.revenue.data} />
          ) : (
            <ErrorState
              action={<DashboardRefreshButton />}
              description={data.revenue.message}
              title="GMV unavailable"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent platform orders</CardTitle>
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

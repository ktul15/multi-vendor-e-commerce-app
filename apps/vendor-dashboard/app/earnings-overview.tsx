import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { DashboardRangeState, SalesPeriod } from "../src/lib/dashboard-range";
import { dashboardRanges, salesPeriods } from "../src/lib/dashboard-range";
import type { VendorSummary } from "../src/lib/dashboard-data";
import type {
  ConnectStatus,
  EarningsPageState,
  EarningsLedger,
  EarningsSummary,
  PayoutHistory,
  TopProducts,
  VendorEarningsData,
} from "../src/lib/earnings-data";
import { DashboardRefreshButton } from "./dashboard-refresh-button";
import { RevenueChart } from "./dashboard-overview";

const inr = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  minimumFractionDigits: 2,
  style: "currency",
});
const date = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const rangeLabels = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" } as const;
const periodLabels: Record<SalesPeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

function formatInr(value: string | number): string {
  const amount = Number(value);
  return inr.format(Number.isFinite(amount) ? amount : 0);
}

function formatCurrency(value: string, currency: string): string {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    currency,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function earningsHref(
  range: DashboardRangeState["range"],
  period: SalesPeriod,
  pages: EarningsPageState = { earningsPage: 1, payoutPage: 1 },
): string {
  return `/earnings?${new URLSearchParams({
    earningsPage: String(pages.earningsPage),
    payoutPage: String(pages.payoutPage),
    period,
    range,
  }).toString()}`;
}

function defaultPeriod(range: DashboardRangeState["range"]): SalesPeriod {
  if (range === "90d") return "week";
  if (range === "1y") return "month";
  return "day";
}

function statusTone(status: string): "danger" | "info" | "success" | "warning" {
  if (status === "PAID" || status === "TRANSFERRED") return "success";
  if (status === "FAILED" || status === "REVERSED") return "danger";
  if (status === "PENDING") return "warning";
  return "info";
}

function SummaryMetrics({
  ledger,
  summary,
}: Readonly<{
  ledger?: EarningsSummary;
  summary: VendorSummary;
}>) {
  const metrics = [
    {
      detail: "Before marketplace commission",
      label: "Gross revenue",
      value: formatInr(summary.revenue.gross),
    },
    {
      detail: "Your earnings after commission",
      label: "Net earnings",
      value: formatInr(summary.revenue.net),
    },
    {
      detail: "Marketplace commission",
      label: "Commission paid",
      value: formatInr(summary.revenue.commission),
    },
    {
      detail: ledger
        ? `${ledger.pending.count.toLocaleString("en-IN")} pending records`
        : "Balance unavailable",
      label: "Pending payout",
      value: ledger ? formatInr(ledger.pending.netAmount) : "—",
    },
  ];
  return (
    <section aria-label="Earnings summary" className="vendor-overview__metrics">
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

function ConnectNotice({ connect }: Readonly<{ connect: ConnectStatus }>) {
  if (connect.payoutsEnabled) {
    return (
      <p className="vendor-earnings__notice vendor-earnings__notice--success" role="status">
        Payouts are enabled. Stripe sends transferred earnings to your connected bank account.
      </p>
    );
  }
  const message =
    connect.onboardingStatus === "NOT_STARTED"
      ? "Payouts are unavailable until Stripe Connect setup is completed. Pending earnings remain recorded."
      : connect.onboardingStatus === "RESTRICTED"
        ? "Payouts are unavailable because Stripe needs additional account information. Pending earnings remain recorded."
        : "Payouts are not enabled yet. Stripe may still be reviewing your account; pending earnings remain recorded.";
  return (
    <p className="vendor-earnings__notice" role="status">
      {message}
    </p>
  );
}

function TopProductsTable({ products }: Readonly<{ products: TopProducts }>) {
  if (products.products.length === 0) {
    return (
      <EmptyState
        description="Products with completed sales will appear here."
        title="No top products in this period"
      />
    );
  }
  return (
    <div
      aria-label="Top products table"
      className="vendor-orders-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="vendor-orders-table">
        <caption className="ui-visually-hidden">Top products by revenue</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Product</th>
            <th scope="col">Orders</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.products.map((product) => (
            <tr key={product.productId}>
              <td>{product.rank}</td>
              <th scope="row">{product.productName}</th>
              <td>{product.orderCount.toLocaleString("en-IN")}</td>
              <td>{formatInr(product.totalRevenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EarningsTable({ earnings }: Readonly<{ earnings: EarningsLedger }>) {
  if (earnings.earnings.length === 0) {
    return (
      <EmptyState
        description="Completed customer payments will create earning records here."
        title="No earnings in this period"
      />
    );
  }
  return (
    <div
      aria-label="Earning records table"
      className="vendor-orders-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="vendor-orders-table vendor-earnings-table">
        <caption className="ui-visually-hidden">Recent vendor earning records</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Gross</th>
            <th scope="col">Commission</th>
            <th scope="col">Net</th>
            <th scope="col">Status</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          {earnings.earnings.map((earning) => (
            <tr key={earning.id}>
              <th scope="row">{earning.order.orderNumber}</th>
              <td>{formatCurrency(earning.grossAmount, earning.currency)}</td>
              <td>
                {formatCurrency(earning.commissionAmount, earning.currency)} (
                {Number(earning.commissionRate).toLocaleString("en-IN")}%)
              </td>
              <td>{formatCurrency(earning.netAmount, earning.currency)}</td>
              <td>
                <Badge tone={statusTone(earning.status)}>{earning.status}</Badge>
              </td>
              <td>
                <time dateTime={earning.createdAt}>{date.format(new Date(earning.createdAt))}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutTable({ payouts }: Readonly<{ payouts: PayoutHistory }>) {
  if (payouts.payouts.length === 0) {
    return (
      <EmptyState
        description="No bank payouts have been reported by Stripe yet. Transferred earnings can take time to appear here."
        title="No payout history"
      />
    );
  }
  return (
    <div
      aria-label="Payout history table"
      className="vendor-orders-table-wrap"
      role="region"
      tabIndex={0}
    >
      <table className="vendor-orders-table">
        <caption className="ui-visually-hidden">Stripe payout history</caption>
        <thead>
          <tr>
            <th scope="col">Payout</th>
            <th scope="col">Amount</th>
            <th scope="col">Status</th>
            <th scope="col">Arrival</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {payouts.payouts.map((payout) => (
            <tr key={payout.id}>
              <th scope="row">{payout.stripePayoutId}</th>
              <td>{formatCurrency(payout.amount, payout.currency)}</td>
              <td>
                <Badge tone={statusTone(payout.status)}>{payout.status}</Badge>
              </td>
              <td>
                {payout.arrivalDate ? (
                  <time dateTime={payout.arrivalDate}>
                    {date.format(new Date(payout.arrivalDate))}
                  </time>
                ) : (
                  "Not scheduled"
                )}
              </td>
              <td>
                {payout.failureReason ??
                  (payout.status === "PENDING" ? "Processing at Stripe" : "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  currentPage,
  href,
  label,
  totalPages,
}: Readonly<{
  currentPage: number;
  href: (page: number) => string;
  label: string;
  totalPages: number;
}>) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="vendor-inventory-pagination">
      {currentPage > 1 ? <Link href={href(currentPage - 1)}>Previous</Link> : <span>Previous</span>}
      <span>
        Page {currentPage.toLocaleString("en-IN")} of {totalPages.toLocaleString("en-IN")}
      </span>
      {currentPage < totalPages ? (
        <Link href={href(currentPage + 1)}>Next</Link>
      ) : (
        <span>Next</span>
      )}
    </nav>
  );
}

export function EarningsOverview({
  data,
  pages = { earningsPage: 1, payoutPage: 1 },
  range,
}: Readonly<{
  data: VendorEarningsData;
  pages?: EarningsPageState;
  range: DashboardRangeState;
}>) {
  const sections = Object.values(data);
  const failures = sections.filter((section) => section.status === "error").length;
  return (
    <div className="vendor-overview vendor-earnings">
      <header className="vendor-overview__header">
        <div>
          <p className="vendor-overview__eyebrow">Store finances</p>
          <h1>Earnings</h1>
          <p>Revenue, commissions, payable earnings, and Stripe payout history.</p>
        </div>
        <nav aria-label="Earnings date range" className="vendor-overview__range">
          {dashboardRanges.map((option) => (
            <Link
              aria-current={range.range === option ? "page" : undefined}
              href={earningsHref(option, defaultPeriod(option))}
              key={option}
            >
              {rangeLabels[option]}
            </Link>
          ))}
        </nav>
      </header>
      {failures > 0 && failures < sections.length ? (
        <div className="vendor-overview__partial" role="status">
          <span>Some earnings sections could not be loaded.</span>
          <DashboardRefreshButton />
        </div>
      ) : null}
      {data.connect.status === "success" ? (
        <ConnectNotice connect={data.connect.data} />
      ) : (
        <ErrorState
          action={<DashboardRefreshButton />}
          description={data.connect.message}
          title="Payout availability unavailable"
        />
      )}
      {data.summary.status === "success" ? (
        <SummaryMetrics
          ledger={data.ledgerSummary.status === "success" ? data.ledgerSummary.data : undefined}
          summary={data.summary.data}
        />
      ) : (
        <ErrorState
          action={<DashboardRefreshButton />}
          description={data.summary.message}
          title="Earnings totals unavailable"
        />
      )}
      {data.summary.status === "success" && data.ledgerSummary.status === "error" ? (
        <p className="vendor-earnings__inline-error" role="alert">
          Pending payout balance is unavailable. {data.ledgerSummary.message}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Revenue over time</CardTitle>
          <nav aria-label="Revenue grouping" className="vendor-overview__period">
            {salesPeriods.map((period) => (
              <Link
                aria-current={range.period === period ? "page" : undefined}
                href={earningsHref(range.range, period)}
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
              title="Revenue chart unavailable"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top products</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topProducts.status === "success" ? (
            <TopProductsTable products={data.topProducts.data} />
          ) : (
            <ErrorState
              action={<DashboardRefreshButton />}
              description={data.topProducts.message}
              title="Top products unavailable"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Earning records</CardTitle>
        </CardHeader>
        <CardContent>
          {data.earnings.status === "success" ? (
            <>
              <EarningsTable earnings={data.earnings.data} />
              <Pagination
                currentPage={data.earnings.data.pagination.page}
                href={(page) =>
                  earningsHref(range.range, range.period, { ...pages, earningsPage: page })
                }
                label="Earning records pages"
                totalPages={data.earnings.data.pagination.totalPages}
              />
            </>
          ) : (
            <ErrorState
              action={<DashboardRefreshButton />}
              description={data.earnings.message}
              title="Earning records unavailable"
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {data.payouts.status === "success" ? (
            <>
              <PayoutTable payouts={data.payouts.data} />
              <Pagination
                currentPage={data.payouts.data.pagination.page}
                href={(page) =>
                  earningsHref(range.range, range.period, { ...pages, payoutPage: page })
                }
                label="Payout history pages"
                totalPages={data.payouts.data.pagination.totalPages}
              />
            </>
          ) : (
            <ErrorState
              action={<DashboardRefreshButton />}
              description={data.payouts.message}
              title="Payout history unavailable"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

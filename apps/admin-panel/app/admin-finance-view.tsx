import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Select,
} from "@repo/ui";
import Link from "next/link";
import type { AdminFinanceData, AdminFinanceReport } from "../src/lib/finance-data";
import { financeHref, financeRanges } from "../src/lib/finance-state";
import type { FinanceState } from "../src/lib/finance-state";
import { formatCount, formatDashboardDate, formatInr } from "../src/lib/format";
import { RevenueChart } from "./dashboard-overview";
import { AdminCommissionView } from "./admin-commission-view";

const rangeLabels = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" } as const;
const statusTone = (status: string) =>
  status === "PAID" || status === "TRANSFERRED"
    ? ("success" as const)
    : status === "FAILED" || status === "REVERSED"
      ? ("danger" as const)
      : ("warning" as const);

function Metrics({ report }: Readonly<{ report: AdminFinanceReport }>) {
  const metrics = [
    [
      "Gross merchandise value",
      formatInr(report.totals.grossRevenue),
      "Billable vendor-order value",
    ],
    [
      "Platform commission",
      formatInr(report.totals.platformCommission),
      "Authoritative earned marketplace share",
    ],
    [
      "Vendor earnings",
      formatInr(report.totals.vendorEarnings),
      "Net amount owed or transferred to vendors",
    ],
    ["Vendor orders", formatCount(report.totals.vendorOrderCount), "Billable earning records"],
  ] as const;
  return (
    <section aria-label="Finance totals" className="admin-finance__metrics">
      {metrics.map(([label, value, detail]) => (
        <Card key={label}>
          <CardContent>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{detail}</small>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function EarningsTable({ report }: Readonly<{ report: AdminFinanceReport }>) {
  if (!report.earningsByStatus.length)
    return (
      <EmptyState
        description="No vendor earnings were recorded in this date range."
        title="No earnings data"
      />
    );
  return (
    <div
      className="admin-finance__table-wrap"
      role="region"
      aria-label="Vendor earnings by status"
      tabIndex={0}
    >
      <table className="admin-finance__table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Records</th>
            <th>Gross</th>
            <th>Commission</th>
            <th>Vendor net</th>
          </tr>
        </thead>
        <tbody>
          {report.earningsByStatus.map((item) => (
            <tr key={item.status}>
              <th scope="row">
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              </th>
              <td>{formatCount(item.count)}</td>
              <td>{formatInr(item.grossRevenue)}</td>
              <td>{formatInr(item.platformCommission)}</td>
              <td>{formatInr(item.vendorEarnings)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Payouts({ report }: Readonly<{ report: AdminFinanceReport }>) {
  return (
    <div className="admin-finance__payouts">
      <section aria-label="Payout totals" className="admin-finance__payout-metrics">
        {report.payoutsByStatus.length ? (
          report.payoutsByStatus.map((item) => (
            <div key={item.status}>
              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              <strong>{formatInr(item.amount)}</strong>
              <small>{formatCount(item.count)} payouts</small>
            </div>
          ))
        ) : (
          <p>No payouts were recorded in this date range.</p>
        )}
      </section>
      {report.recentPayouts.length ? (
        <div
          className="admin-finance__table-wrap"
          role="region"
          aria-label="Recent vendor payouts"
          tabIndex={0}
        >
          <table className="admin-finance__table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Arrival / failure</th>
              </tr>
            </thead>
            <tbody>
              {report.recentPayouts.map((payout) => (
                <tr key={payout.id}>
                  <th scope="row">{payout.vendorProfile.storeName}</th>
                  <td>
                    <Badge tone={statusTone(payout.status)}>{payout.status}</Badge>
                  </td>
                  <td>{formatInr(payout.amount)}</td>
                  <td>
                    <time dateTime={payout.createdAt}>{formatDashboardDate(payout.createdAt)}</time>
                  </td>
                  <td>
                    {payout.failureReason ??
                      (payout.arrivalDate
                        ? formatDashboardDate(payout.arrivalDate)
                        : "Pending update")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          description="Stripe payout events will appear after vendors receive or attempt transfers."
          title="No recent payouts"
        />
      )}
    </div>
  );
}

export function AdminFinanceView({
  data,
  error,
  state,
}: Readonly<{ data?: AdminFinanceData; error?: string; state: FinanceState }>) {
  const report = data?.report.status === "success" ? data.report.data : undefined;
  return (
    <div className="admin-finance">
      <header className="admin-finance__header">
        <div>
          <p>Marketplace finance</p>
          <h1>Revenue and payouts</h1>
          <p>
            Server-calculated INR totals for {state.startInput || "the selected start"} through{" "}
            {state.endInput || "the selected end"}.
          </p>
        </div>
        <nav aria-label="Finance date presets">
          {financeRanges.map((range) => (
            <Link
              aria-current={state.range === range ? "page" : undefined}
              href={financeHref(range)}
              key={range}
            >
              {rangeLabels[range]}
            </Link>
          ))}
        </nav>
      </header>
      <Card>
        <CardContent>
          <form action="/finance" className="admin-finance__filters">
            <input name="range" type="hidden" value="custom" />
            <label>
              Start date
              <input defaultValue={state.startInput} name="startDate" required type="date" />
            </label>
            <label>
              End date
              <input defaultValue={state.endInput} name="endDate" required type="date" />
            </label>
            <Select defaultValue={state.period} label="Group chart by" name="period">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </Select>
            <button className="ui-button ui-button--secondary ui-button--md" type="submit">
              Apply range
            </button>
          </form>
          {state.validationError ? (
            <p className="admin-finance__notice admin-finance__notice--error" role="alert">
              {state.validationError}
            </p>
          ) : null}
        </CardContent>
      </Card>
      {error ? (
        <ErrorState
          action={
            <Link className="ui-button ui-button--secondary ui-button--md" href="/finance">
              Retry
            </Link>
          }
          description={error}
          title="Finance unavailable"
        />
      ) : null}
      {data && data.report.status === "error" ? (
        <ErrorState
          action={
            <Link className="ui-button ui-button--secondary ui-button--md" href="/finance">
              Retry report
            </Link>
          }
          description={data.report.message}
          title="Financial report unavailable"
        />
      ) : null}
      {report ? (
        <>
          <Metrics report={report} />
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Gross merchandise value</CardTitle>
                <p>Backend-filtered billable order value; excludes failed and reversed earnings.</p>
              </div>
            </CardHeader>
            <CardContent>
              <RevenueChart revenue={report} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Vendor earnings by status</CardTitle>
                <p>
                  Status totals come directly from earning records and are not recalculated from the
                  current rate.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <EarningsTable report={report} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Vendor payouts</CardTitle>
                <p>Payout status may lag while Stripe processes or delivers funds.</p>
              </div>
            </CardHeader>
            <CardContent>
              <Payouts report={report} />
            </CardContent>
          </Card>
        </>
      ) : null}
      {data?.commission.status === "success" ? (
        <AdminCommissionView commission={data.commission.data} compact />
      ) : data?.commission.status === "error" ? (
        <AdminCommissionView compact error={data.commission.message} />
      ) : null}
    </div>
  );
}

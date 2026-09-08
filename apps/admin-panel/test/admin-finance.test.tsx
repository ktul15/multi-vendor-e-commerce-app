import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminFinanceView } from "../app/admin-finance-view";
import type { AdminFinanceData, AdminFinanceReport } from "../src/lib/finance-data";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const state = {
  endDate: "2026-08-16T00:00:00.000Z",
  endInput: "2026-08-15",
  period: "day" as const,
  range: "30d" as const,
  startDate: "2026-08-01T00:00:00.000Z",
  startInput: "2026-08-01",
};
const report: AdminFinanceReport = {
  dateRange: { endDate: state.endDate, startDate: state.startDate },
  earningsByStatus: [
    {
      count: 2,
      grossRevenue: "1500.00",
      platformCommission: "150.00",
      status: "TRANSFERRED",
      vendorEarnings: "1350.00",
    },
    {
      count: 1,
      grossRevenue: "200.00",
      platformCommission: "20.00",
      status: "FAILED",
      vendorEarnings: "180.00",
    },
  ],
  payoutsByStatus: [
    { amount: "1000.00", count: 1, status: "PAID" },
    { amount: "250.00", count: 1, status: "FAILED" },
  ],
  period: "day",
  recentPayouts: [
    {
      amount: "250.00",
      arrivalDate: null,
      createdAt: "2026-08-14T00:00:00.000Z",
      currency: "INR",
      failureReason: "Bank account closed",
      id: "payout-1",
      status: "FAILED",
      vendorProfile: { id: "vendor-1", storeName: "Asha Market" },
    },
  ],
  series: [{ orderCount: 2, periodStart: "2026-08-01", revenue: "1500.00" }],
  totals: {
    grossRevenue: "1500.00",
    platformCommission: "150.00",
    vendorEarnings: "1350.00",
    vendorOrderCount: 2,
  },
};
const data: AdminFinanceData = {
  commission: { data: { rate: 10, source: "database" }, status: "success" },
  report: { data: report, status: "success" },
};

describe("admin finance reporting", () => {
  it("renders authoritative INR totals, statuses, chart, and payout failure details", () => {
    renderWithProviders(<AdminFinanceView data={data} state={state} />);
    const totals = screen.getByRole("region", { name: "Finance totals" });
    expect(within(totals).getByText("₹1,500.00")).toBeVisible();
    expect(within(totals).getByText("₹150.00")).toBeVisible();
    expect(within(totals).getByText("₹1,350.00")).toBeVisible();
    expect(screen.getByRole("img", { name: /Gross merchandise value over time/ })).toBeVisible();
    expect(screen.getByRole("region", { name: "Vendor earnings by status" })).toHaveTextContent(
      "TRANSFERRED",
    );
    expect(screen.getByRole("region", { name: "Recent vendor payouts" })).toHaveTextContent(
      "Bank account closed",
    );
    expect(screen.getByText("10.00%")).toBeVisible();
  });
  it("explains empty and partial failure states", () => {
    const empty = {
      ...report,
      earningsByStatus: [],
      payoutsByStatus: [],
      recentPayouts: [],
      series: [],
    };
    const { rerender } = renderWithProviders(
      <AdminFinanceView
        data={{ ...data, report: { data: empty, status: "success" } }}
        state={state}
      />,
    );
    expect(screen.getByRole("heading", { name: "No GMV in this period" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "No earnings data" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "No recent payouts" })).toBeVisible();
    rerender(
      <AdminFinanceView
        data={{
          commission: data.commission,
          report: { message: "Report delayed", status: "error" },
        }}
        state={state}
      />,
    );
    expect(screen.getByRole("heading", { name: "Financial report unavailable" })).toBeVisible();
    expect(screen.getByText("10.00%")).toBeVisible();
  });
  it("blocks invalid custom ranges before loading data", () => {
    renderWithProviders(
      <AdminFinanceView
        state={{
          ...state,
          endInput: "2026-08-01",
          range: "custom",
          startInput: "2026-08-15",
          validationError: "Choose an ordered date range of 366 days or fewer.",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("366 days");
    expect(screen.queryByText("Gross merchandise value")).not.toBeInTheDocument();
  });
});

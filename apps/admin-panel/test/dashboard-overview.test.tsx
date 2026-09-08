import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "../app/dashboard-overview";
import type { AdminDashboardData } from "../src/lib/dashboard-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const range = {
  endDate: "2026-08-14T00:00:00.000Z",
  period: "day" as const,
  range: "30d" as const,
  startDate: "2026-07-15T00:00:00.000Z",
};

const order = {
  createdAt: "2026-08-09T08:00:00.000Z",
  discount: "100.00",
  fulfillmentStatus: {
    kind: "SINGLE" as const,
    status: "PROCESSING" as const,
    statuses: ["PROCESSING" as const],
  },
  id: "order-1",
  orderNumber: "ORD-1001",
  payment: { method: "CARD" as const, status: "SUCCEEDED" as const },
  subtotal: "2500.25",
  tax: "0.00",
  total: "2400.25",
  user: { email: "buyer@example.test", id: "buyer-1", name: "Asha Buyer" },
  vendorOrders: [
    {
      id: "vendor-order-1",
      status: "PROCESSING" as const,
      subtotal: "2500.25",
      vendor: { vendorProfile: { storeName: "Asha Market" } },
      vendorId: "vendor-1",
    },
  ],
};

const revenue = {
  dateRange: { endDate: range.endDate, startDate: range.startDate },
  period: "day" as const,
  series: [
    { orderCount: 2, periodStart: "2026-08-08", revenue: "10000.25" },
    { orderCount: 1, periodStart: "2026-08-09", revenue: "2500.25" },
  ],
};

const completeData: AdminDashboardData = {
  orders: {
    data: { items: [order], meta: { limit: 5, page: 1, total: 1, totalPages: 1 } },
    status: "success",
  },
  revenue: { data: revenue, status: "success" },
  summary: {
    data: {
      bannedUsers: 2,
      pendingVendors: 3,
      platformRevenue: "75000.50",
      totalOrders: 850,
      totalProducts: 320,
      totalUsers: 1200,
      totalVendors: 45,
    },
    status: "success",
  },
};

describe("admin dashboard overview", () => {
  it("accurately labels platform commission, GMV, actionable counts, and recent activity", () => {
    renderWithProviders(<DashboardOverview data={completeData} range={range} />);

    expect(screen.getByText("₹75,000.50")).toBeVisible();
    expect(screen.getByText("Earned marketplace commission")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Gross merchandise value" })).toBeVisible();
    expect(screen.getByText("3 pending review")).toHaveAttribute("href", "/vendors");
    expect(screen.getByText("2 banned")).toHaveAttribute("href", "/users");
    expect(screen.getByText("320")).toBeVisible();
    expect(screen.getByRole("img", { name: /Gross merchandise value over time/i })).toBeVisible();
    const table = screen.getByRole("table", { name: "Five most recent platform orders" });
    expect(within(table).getByText("ORD-1001")).toBeVisible();
    expect(within(table).getByText("Asha Market")).toBeVisible();
    expect(screen.getByRole("link", { name: "30 days" })).toHaveAttribute("aria-current", "page");
  });

  it("renders empty states for successful responses without activity", () => {
    renderWithProviders(
      <DashboardOverview
        data={{
          ...completeData,
          orders: {
            data: { items: [], meta: { limit: 5, page: 1, total: 0, totalPages: 1 } },
            status: "success",
          },
          revenue: { data: { ...revenue, series: [] }, status: "success" },
        }}
        range={range}
      />,
    );

    expect(screen.getByRole("heading", { name: "No GMV in this period" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "No orders yet" })).toBeVisible();
  });

  it("announces the true zero maximum for an all-zero revenue series", () => {
    renderWithProviders(
      <DashboardOverview
        data={{
          ...completeData,
          revenue: {
            data: {
              ...revenue,
              series: [{ orderCount: 0, periodStart: "2026-08-08", revenue: "0.00" }],
            },
            status: "success",
          },
        }}
        range={range}
      />,
    );

    expect(
      screen.getByText(/with a maximum gross merchandise value of ₹0\.00/i),
    ).toBeInTheDocument();
  });

  it("keeps successful sections visible when one request fails", () => {
    renderWithProviders(
      <DashboardOverview
        data={{
          ...completeData,
          revenue: { message: "Gross merchandise value could not be loaded.", status: "error" },
        }}
        range={range}
      />,
    );

    expect(screen.getByText("Some dashboard sections could not be loaded.")).toBeVisible();
    expect(screen.getByText("₹75,000.50")).toBeVisible();
    expect(screen.getByText("ORD-1001")).toBeVisible();
    expect(screen.getByRole("heading", { name: "GMV unavailable" })).toBeVisible();
  });

  it("renders an error state for every unavailable section", () => {
    const unavailable = (message: string) => ({ message, status: "error" as const });
    renderWithProviders(
      <DashboardOverview
        data={{
          orders: unavailable("orders"),
          revenue: unavailable("revenue"),
          summary: unavailable("summary"),
        }}
        range={range}
      />,
    );

    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(3);
    expect(
      screen.queryByText("Some dashboard sections could not be loaded."),
    ).not.toBeInTheDocument();
  });

  it("provides the responsive table as a keyboard-focusable scroll region", () => {
    renderWithProviders(<DashboardOverview data={completeData} range={range} />);

    expect(screen.getByRole("region", { name: "Recent platform orders" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});

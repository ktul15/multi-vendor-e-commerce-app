import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "../app/dashboard-overview";
import type { VendorDashboardData } from "../src/lib/dashboard-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const range = {
  endDate: "2026-08-10T00:00:00.000Z",
  period: "day" as const,
  range: "30d" as const,
  startDate: "2026-07-11T00:00:00.000Z",
};

const order = {
  createdAt: "2026-08-09T08:00:00.000Z",
  id: "vendor-order-1",
  items: [],
  order: {
    createdAt: "2026-08-09T08:00:00.000Z",
    id: "order-1",
    notes: null,
    orderNumber: "ORD-1001",
    payment: null,
    shippingAddress: {},
    updatedAt: "2026-08-09T08:00:00.000Z",
    user: { email: "buyer@example.test", id: "buyer-1", name: "Asha Buyer" },
  },
  orderId: "order-1",
  status: "DELIVERED" as const,
  subtotal: "2500.25",
  trackingCarrier: null,
  trackingNumber: null,
  updatedAt: "2026-08-09T08:00:00.000Z",
  vendorId: "vendor-1",
};

const salesData = {
  dateRange: { endDate: range.endDate, startDate: range.startDate },
  period: "day" as const,
  series: [
    { orderCount: 2, periodStart: "2026-08-08", revenue: "10000.25" },
    { orderCount: 1, periodStart: "2026-08-09", revenue: "2500.25" },
  ],
};

const completeData: VendorDashboardData = {
  orders: {
    data: { items: [order], meta: { limit: 5, page: 1, total: 1, totalPages: 1 } },
    status: "success",
  },
  sales: {
    data: salesData,
    status: "success",
  },
  summary: {
    data: {
      dateRange: { endDate: range.endDate, startDate: range.startDate },
      orders: { billableOrders: 3, byStatus: { DELIVERED: 3 }, totalOrders: 4 },
      revenue: { commission: "1250.05", gross: "12500.50", net: "11250.45" },
    },
    status: "success",
  },
};

describe("vendor dashboard overview", () => {
  it("renders backend metrics in INR, an accessible chart, and recent orders", () => {
    renderWithProviders(<DashboardOverview data={completeData} range={range} />);

    expect(screen.getByText("₹12,500.50")).toBeVisible();
    expect(screen.getByText("₹11,250.45")).toBeVisible();
    expect(screen.getByRole("img", { name: /Revenue over time/i })).toBeVisible();
    const table = screen.getByRole("table", { name: "Five most recent vendor orders" });
    expect(within(table).getByText("ORD-1001")).toBeVisible();
    expect(within(table).getByText("Asha Buyer")).toBeVisible();
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
          sales: { data: { ...salesData, series: [] }, status: "success" },
        }}
        range={range}
      />,
    );

    expect(screen.getByRole("heading", { name: "No sales in this period" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "No orders yet" })).toBeVisible();
  });

  it("keeps successful sections visible when one request fails", () => {
    renderWithProviders(
      <DashboardOverview
        data={{
          ...completeData,
          sales: { message: "Sales history could not be loaded.", status: "error" },
        }}
        range={range}
      />,
    );

    expect(screen.getByText("Some dashboard sections could not be loaded.")).toBeVisible();
    expect(screen.getByText("₹12,500.50")).toBeVisible();
    expect(screen.getByText("ORD-1001")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sales unavailable" })).toBeVisible();
  });

  it("renders an error state for every unavailable section", () => {
    const unavailable = (message: string) => ({ message, status: "error" as const });
    renderWithProviders(
      <DashboardOverview
        data={{
          orders: unavailable("orders"),
          sales: unavailable("sales"),
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
});

import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { EarningsOverview } from "../app/earnings-overview";
import type { VendorEarningsData } from "../src/lib/earnings-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const range = {
  endDate: "2026-08-11T00:00:00.000Z",
  period: "day" as const,
  range: "30d" as const,
  startDate: "2026-07-12T00:00:00.000Z",
};
const amounts = { commissionAmount: 0, count: 0, grossAmount: 0, netAmount: 0 };
const completeData: VendorEarningsData = {
  connect: {
    data: {
      chargesEnabled: true,
      detailsSubmitted: true,
      onboardingStatus: "COMPLETE",
      payoutsEnabled: true,
      provider: "STRIPE",
    },
    status: "success",
  },
  earnings: {
    data: {
      earnings: [
        {
          commissionAmount: "101.25",
          commissionRate: "10.125",
          createdAt: "2026-08-09T08:00:00.000Z",
          currency: "INR",
          grossAmount: "1000.00",
          id: "earning-1",
          netAmount: "898.75",
          order: { orderNumber: "ORD-1001" },
          orderId: "order-1",
          status: "TRANSFERRED",
          providerTransferId: "tr_1",
          transferredAt: "2026-08-09T09:00:00.000Z",
          updatedAt: "2026-08-09T09:00:00.000Z",
          vendorOrderId: "vendor-order-1",
          vendorProfileId: "vendor-profile-1",
        },
      ],
      pagination: { limit: 10, page: 1, total: 11, totalPages: 2 },
    },
    status: "success",
  },
  ledgerSummary: {
    data: {
      failed: amounts,
      pending: { ...amounts, count: 2, netAmount: 777.77 },
      reversed: amounts,
      transferred: amounts,
    },
    status: "success",
  },
  payouts: {
    data: {
      pagination: { limit: 10, page: 1, total: 11, totalPages: 2 },
      payouts: [
        {
          amount: "700.00",
          arrivalDate: "2026-08-12T00:00:00.000Z",
          createdAt: "2026-08-10T00:00:00.000Z",
          currency: "INR",
          failureReason: null,
          id: "payout-1",
          status: "PAID",
          providerPayoutId: "po_1",
          provider: "STRIPE",
          updatedAt: "2026-08-10T00:00:00.000Z",
          vendorProfileId: "vendor-profile-1",
        },
      ],
    },
    status: "success",
  },
  sales: {
    data: {
      dateRange: range,
      period: "day",
      series: [{ orderCount: 1, periodStart: "2026-08-09", revenue: "1000.00" }],
    },
    status: "success",
  },
  summary: {
    data: {
      dateRange: range,
      orders: { billableOrders: 1, byStatus: { DELIVERED: 1 }, totalOrders: 1 },
      revenue: { commission: "101.25", gross: "1000.00", net: "898.75" },
    },
    status: "success",
  },
  topProducts: {
    data: {
      dateRange: range,
      products: [
        {
          orderCount: 1,
          productId: "product-1",
          productName: "Handmade Lamp",
          rank: 1,
          totalRevenue: "1000.00",
        },
      ],
    },
    status: "success",
  },
};

describe("earnings overview", () => {
  it("renders server totals in INR without recomputing them and shows reporting history", () => {
    renderWithProviders(<EarningsOverview data={completeData} range={range} />);

    const summary = within(screen.getByRole("region", { name: "Earnings summary" }));
    expect(summary.getByText("₹1,000.00")).toBeVisible();
    expect(summary.getByText("₹898.75")).toBeVisible();
    expect(summary.getByText("₹101.25")).toBeVisible();
    expect(summary.getByText("₹777.77")).toBeVisible();
    expect(screen.getByRole("img", { name: /Revenue over time/i })).toBeVisible();
    expect(
      within(screen.getByRole("table", { name: "Top products by revenue" })).getByText(
        "Handmade Lamp",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("table", { name: "Recent vendor earning records" })).getByText(
        "ORD-1001",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("table", { name: "Payment-provider payout history" })).getByText(
        "po_1",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("navigation", { name: "Earning records pages" })).getByRole("link", {
        name: "Next",
      }),
    ).toHaveAttribute("href", expect.stringContaining("earningsPage=2"));
    expect(
      within(screen.getByRole("navigation", { name: "Payout history pages" })).getByRole("link", {
        name: "Next",
      }),
    ).toHaveAttribute("href", expect.stringContaining("payoutPage=2"));
  });

  it("explains unavailable payouts and empty payout history", () => {
    renderWithProviders(
      <EarningsOverview
        data={{
          ...completeData,
          connect: {
            data: {
              chargesEnabled: false,
              detailsSubmitted: false,
              onboardingStatus: "NOT_STARTED",
              payoutsEnabled: false,
              provider: "STRIPE",
            },
            status: "success",
          },
          payouts: {
            data: { pagination: { limit: 10, page: 1, total: 0, totalPages: 0 }, payouts: [] },
            status: "success",
          },
        }}
        range={range}
      />,
    );

    expect(screen.getByText(/Set up Stripe to receive payouts/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Set up Stripe payouts" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "No payout history" })).toBeVisible();
  });

  it("explains restricted and returned states using authoritative account data", () => {
    renderWithProviders(
      <EarningsOverview
        connectOutcome="returned"
        data={{
          ...completeData,
          connect: {
            data: {
              chargesEnabled: false,
              detailsSubmitted: true,
              onboardingStatus: "RESTRICTED",
              payoutsEnabled: false,
              provider: "STRIPE",
            },
            status: "success",
          },
        }}
        range={range}
      />,
    );

    expect(
      screen.getByText(/account state below was refreshed directly from Stripe/i),
    ).toBeVisible();
    expect(screen.getByText(/Stripe has restricted payouts/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Update Stripe details" })).toBeVisible();
  });

  it("announces completed provider onboarding as a successful status", () => {
    renderWithProviders(
      <EarningsOverview connectOutcome="provider-complete" data={completeData} range={range} />,
    );

    const notice = screen.getByText(/payment-provider sandbox onboarding completed successfully/i);
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveClass("vendor-earnings__notice--success");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows provider-specific Razorpay sandbox onboarding without a Stripe redirect", () => {
    renderWithProviders(
      <EarningsOverview
        data={{
          ...completeData,
          connect: {
            data: {
              chargesEnabled: false,
              detailsSubmitted: false,
              onboardingStatus: "NOT_STARTED",
              payoutsEnabled: false,
              provider: "RAZORPAY",
              sandbox: true,
            },
            status: "success",
          },
        }}
        range={range}
      />,
    );

    expect(screen.getByText(/Set up Razorpay to receive payouts/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Set up Razorpay payouts" })).toBeVisible();
  });

  it("shows a retryable failure without hiding authoritative earnings data", () => {
    renderWithProviders(
      <EarningsOverview connectOutcome="return-failed" data={completeData} range={range} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not reconcile your Stripe account",
    );
    expect(screen.getByText("Handmade Lamp")).toBeVisible();
  });

  it("keeps successful panels visible when payout history fails", () => {
    renderWithProviders(
      <EarningsOverview
        data={{
          ...completeData,
          payouts: { message: "Payout history could not be loaded.", status: "error" },
        }}
        range={range}
      />,
    );

    expect(screen.getByText("Some earnings sections could not be loaded.")).toBeVisible();
    expect(screen.getByText("Handmade Lamp")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Payout history unavailable" })).toBeVisible();
  });
});

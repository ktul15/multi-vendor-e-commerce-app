import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOrderDetailView } from "../app/admin-order-detail-view";
import { AdminOrdersView } from "../app/admin-orders-view";
import type { AdminOrder, AdminOrderDetail } from "../src/lib/order-data";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  navigation.refresh.mockReset();
  vi.useRealTimers();
});

const orderId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";

const summary: AdminOrder = {
  createdAt: "2026-08-14T08:00:00.000Z",
  discount: "100.00",
  fulfillmentStatus: {
    kind: "MIXED",
    status: null,
    statuses: ["PROCESSING", "SHIPPED"],
  },
  id: orderId,
  orderNumber: "ORD-2026-001",
  payment: { method: "CARD", status: "SUCCEEDED" },
  subtotal: "2100.00",
  tax: "100.00",
  total: "2100.00",
  user: { email: "customer@example.test", id: customerId, name: "Ravi Customer" },
  vendorOrders: [
    {
      id: "vendor-order-1",
      status: "PROCESSING",
      subtotal: "1200.00",
      vendor: { vendorProfile: { storeName: "Asha Market" } },
      vendorId: "vendor-1",
    },
    {
      id: "vendor-order-2",
      status: "SHIPPED",
      subtotal: "900.00",
      vendor: { vendorProfile: { storeName: "Nila Store" } },
      vendorId: "vendor-2",
    },
  ],
};

const detail: AdminOrderDetail = {
  address: {
    city: "Ahmedabad",
    country: "India",
    fullName: "Ravi Customer",
    phone: "9999999999",
    state: "Gujarat",
    street: "12 Market Road",
    zipCode: "380001",
  },
  cancellationReason: null,
  createdAt: summary.createdAt,
  discount: summary.discount,
  fulfillmentStatus: summary.fulfillmentStatus,
  id: summary.id,
  notes: "Leave at reception",
  orderNumber: summary.orderNumber,
  payment: { method: "CARD", paidAt: "2026-08-14T08:01:00.000Z", status: "SUCCEEDED" },
  promoCode: { code: "SAVE100", discountType: "FIXED", discountValue: "100.00" },
  shippingAddress: { city: "Ahmedabad", fullName: "Ravi Customer", zipCode: "380001" },
  subtotal: summary.subtotal,
  tax: summary.tax,
  total: summary.total,
  updatedAt: "2026-08-14T09:00:00.000Z",
  user: summary.user,
  vendorOrders: [
    {
      id: "vendor-order-1",
      items: [
        {
          id: "item-1",
          quantity: 2,
          totalPrice: "1200.00",
          unitPrice: "600.00",
          variant: {
            color: "Blue",
            price: "600.00",
            product: { images: ["https://cdn.test/shirt.jpg"], name: "Linen Shirt" },
            size: "M",
            sku: "LINEN-BLU-M",
          },
        },
      ],
      status: "PROCESSING",
      subtotal: "1200.00",
      trackingCarrier: null,
      trackingNumber: null,
      vendor: {
        vendorProfile: {
          id: "33333333-3333-4333-8333-333333333333",
          storeName: "Asha Market",
        },
      },
      vendorId: "vendor-1",
    },
    {
      id: "vendor-order-2",
      items: [],
      status: "SHIPPED",
      subtotal: "900.00",
      trackingCarrier: "BlueDart",
      trackingNumber: "TRACK-123",
      vendor: {
        vendorProfile: {
          id: "44444444-4444-4444-8444-444444444444",
          storeName: "Nila Store",
        },
      },
      vendorId: "vendor-2",
    },
  ],
};

const state = { page: 1, pageSize: 20, search: "" } as const;

describe("admin order management", () => {
  it("renders list navigation with backend fulfillment and payment labels", () => {
    renderWithProviders(
      <AdminOrdersView
        orders={{ items: [summary], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } }}
        state={state}
      />,
    );
    expect(screen.getByRole("link", { name: "ORD-2026-001" })).toHaveAttribute(
      "href",
      `/orders/${orderId}`,
    );
    expect(screen.getByText("MIXED")).toBeVisible();
    expect(screen.getByText("SUCCEEDED")).toBeVisible();
    expect(screen.getByText("Asha Market, Nila Store")).toBeVisible();
  });

  it("uses the backend NONE label when an order has no vendor fulfillment", () => {
    const noFulfillmentSummary: AdminOrder = {
      ...summary,
      fulfillmentStatus: { kind: "NONE", status: null, statuses: [] },
      vendorOrders: [],
    };
    const noFulfillmentDetail: AdminOrderDetail = {
      ...detail,
      fulfillmentStatus: noFulfillmentSummary.fulfillmentStatus,
      vendorOrders: [],
    };
    const { rerender } = renderWithProviders(
      <AdminOrdersView
        orders={{
          items: [noFulfillmentSummary],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
        state={state}
      />,
    );
    expect(screen.getByText("NONE")).toBeVisible();

    rerender(<AdminOrderDetailView order={noFulfillmentDetail} />);
    expect(screen.getByText("Fulfillment: NONE")).toBeVisible();
    expect(screen.getByText("All vendor sub-orders are NONE.")).toBeVisible();
  });

  it("renders customer, totals, payment, shipping, vendors, items, and fulfillment states", () => {
    renderWithProviders(<AdminOrderDetailView order={detail} />);
    expect(screen.getByRole("heading", { name: "ORD-2026-001" })).toBeVisible();
    expect(screen.getByText("Fulfillment: MIXED")).toBeVisible();
    expect(screen.getByText("Payment: SUCCEEDED")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ravi Customer" })).toHaveAttribute(
      "href",
      `/users/${customerId}`,
    );
    expect(screen.getAllByText("₹2,100.00")).toHaveLength(2);
    expect(screen.getByText("CARD")).toBeVisible();
    expect(screen.getByText("12 Market Road")).toBeVisible();
    expect(screen.getByText("This order has mixed states: PROCESSING, SHIPPED.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Asha Market" })).toHaveAttribute(
      "href",
      "/vendors/33333333-3333-4333-8333-333333333333",
    );
    const items = screen.getByRole("region", { name: "Asha Market order items" });
    expect(within(items).getByRole("rowheader", { name: "Linen Shirt" })).toBeVisible();
    expect(within(items).getByRole("cell", { name: "LINEN-BLU-M" })).toBeVisible();
    expect(screen.getByText("TRACK-123")).toBeVisible();
  });

  it("refreshes current server data from list and detail views", async () => {
    const actor = userEvent.setup();
    const { rerender } = renderWithProviders(
      <AdminOrdersView
        orders={{ items: [summary], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } }}
        state={state}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Refresh" }));
    expect(navigation.refresh).toHaveBeenCalledOnce();

    rerender(<AdminOrderDetailView order={detail} />);
    await actor.click(screen.getByRole("button", { name: "Refresh" }));
    expect(navigation.refresh).toHaveBeenCalledTimes(2);
  });

  it("shows filtered empty and retryable error states", () => {
    const { rerender } = renderWithProviders(
      <AdminOrdersView
        orders={{ items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } }}
        state={{ ...state, status: "DELIVERED" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No matching orders" })).toBeVisible();
    rerender(<AdminOrdersView error="Orders could not be loaded." state={state} />);
    expect(screen.getByRole("heading", { name: "Orders unavailable" })).toBeVisible();
  });
});

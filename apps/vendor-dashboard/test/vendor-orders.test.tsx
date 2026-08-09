import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { VendorOrderDetailView } from "../app/vendor-order-detail";
import { VendorOrdersView } from "../app/vendor-orders-view";
import type { VendorOrder } from "../src/lib/order-data";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "vendor_csrf_token=csrf-token; path=/";
});

const order: VendorOrder = {
  allowedNextStatuses: ["CONFIRMED"],
  createdAt: "2026-08-09T08:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  items: [
    {
      createdAt: "2026-08-09T08:00:00.000Z",
      id: "item-1",
      quantity: 2,
      totalPrice: "500.00",
      unitPrice: "250.00",
      updatedAt: "2026-08-09T08:00:00.000Z",
      variant: {
        color: "Blue",
        id: "variant-1",
        price: "250.00",
        product: { id: "product-1", images: [], name: "Travel Mug" },
        size: "Large",
        sku: "MUG-BLU",
      },
      variantId: "variant-1",
      vendorOrderId: "11111111-1111-4111-8111-111111111111",
    },
  ],
  order: {
    createdAt: "2026-08-09T08:00:00.000Z",
    id: "order-1",
    notes: "Leave at reception",
    orderNumber: "ORD-42",
    payment: { method: "CARD", paidAt: "2026-08-09T08:01:00.000Z", status: "SUCCEEDED" },
    shippingAddress: {
      city: "Pune",
      country: "India",
      fullName: "Asha Buyer",
      phone: "12345",
      state: "MH",
      street: "42 Market Road",
      zipCode: "411001",
    },
    updatedAt: "2026-08-09T08:00:00.000Z",
    user: { email: "asha@example.test", id: "customer-1", name: "Asha Buyer" },
  },
  orderId: "order-1",
  status: "PENDING",
  subtotal: "500.00",
  trackingCarrier: null,
  trackingNumber: null,
  updatedAt: "2026-08-09T08:00:00.000Z",
  vendorId: "vendor-1",
};

describe("vendor orders", () => {
  it("renders server results, filters, pagination, and a direct action without a dropdown", () => {
    renderWithProviders(
      <VendorOrdersView
        orders={{ items: [order], meta: { limit: 10, page: 1, total: 12, totalPages: 2 } }}
        state={{ page: 1, pageSize: 10, search: "Asha", status: "PENDING" }}
      />,
    );
    expect(screen.getByRole("table", { name: "Vendor orders" })).toHaveTextContent("ORD-42");
    expect(screen.getByRole("button", { name: "Confirm order" })).toBeVisible();
    expect(screen.queryByLabelText("Next status")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      expect.stringContaining("search=Asha"),
    );
  });

  it("shows items, customer, shipment totals, and payment state on details", () => {
    renderWithProviders(<VendorOrderDetailView order={order} />);
    expect(screen.getByText("Travel Mug")).toBeVisible();
    expect(screen.getByText("42 Market Road")).toBeVisible();
    expect(screen.getAllByText("₹500.00")).toHaveLength(2);
    expect(screen.getByText("SUCCEEDED")).toBeVisible();
    expect(screen.getByText("Leave at reception")).toBeVisible();
  });

  it("confirms once, disables concurrent submission, and surfaces a conflict", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<VendorOrderDetailView order={order} />);
    await user.click(screen.getByRole("button", { name: "Confirm order" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Confirm order" });
    await user.click(confirm);
    expect(confirm).toBeDisabled();
    expect(fetch).toHaveBeenCalledOnce();
    resolveResponse(
      Response.json(
        { message: "Order status changed. Refresh and try again", success: false },
        { status: 409 },
      ),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Refresh and try again");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("discards a stale selected transition when refreshed order data changes", async () => {
    const user = userEvent.setup();
    const multipleActions: VendorOrder = {
      ...order,
      allowedNextStatuses: ["CONFIRMED", "PROCESSING"],
    };
    const { rerender } = renderWithProviders(<VendorOrderDetailView order={multipleActions} />);
    await user.selectOptions(screen.getByLabelText("Next status"), "PROCESSING");

    rerender(
      <VendorOrderDetailView
        order={{
          ...multipleActions,
          allowedNextStatuses: ["SHIPPED"],
          status: "PROCESSING",
        }}
      />,
    );

    expect(screen.queryByLabelText("Next status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark shipped" })).toBeVisible();
  });
});

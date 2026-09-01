import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminVendorDetailView } from "../app/admin-vendor-detail-view";
import { AdminVendorsView } from "../app/admin-vendors-view";
import type { AdminVendor, AdminVendorDetail } from "../src/lib/vendor-data";
import type { VendorStatus } from "../src/lib/vendor-list-state";

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
  document.cookie = "admin_csrf_token=csrf-token; path=/";
});

function vendor(status: VendorStatus, suffix = status): AdminVendor {
  return {
    commissionRate: status === "APPROVED" ? "12.50" : null,
    createdAt: "2026-08-09T08:00:00.000Z",
    id: `${suffix === "PENDING" ? "11111111" : suffix === "APPROVED" ? "22222222" : suffix === "REJECTED" ? "33333333" : "44444444"}-1111-4111-8111-111111111111`,
    status,
    storeName: `${status} Store`,
    paymentOnboardingStatus: status === "APPROVED" ? "COMPLETE" : "PENDING",
    paymentProvider: "RAZORPAY",
    settlementCountry: "IN",
    user: {
      email: `${status.toLowerCase()}@example.test`,
      id: `owner-${status}`,
      isBanned: status === "SUSPENDED",
      name: `${status} Owner`,
    },
  };
}

const state = { page: 1, pageSize: 20, search: "" } as const;

describe("admin vendor management", () => {
  it("renders every lifecycle state with only valid actions", () => {
    const vendors = [
      vendor("PENDING"),
      vendor("APPROVED"),
      vendor("REJECTED"),
      vendor("SUSPENDED"),
    ];
    renderWithProviders(
      <AdminVendorsView
        state={state}
        vendors={{ items: vendors, meta: { limit: 20, page: 1, total: 4, totalPages: 1 } }}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getByRole("button", { name: "Approve" })).toBeVisible();
    expect(within(rows[0]!).getByRole("button", { name: "Reject" })).toBeVisible();
    expect(within(rows[1]!).getByRole("button", { name: "Suspend" })).toBeVisible();
    expect(within(rows[2]!).getByRole("button", { name: "Approve" })).toBeVisible();
    expect(within(rows[3]!).getByRole("button", { name: "Approve" })).toBeVisible();
    expect(within(rows[3]!).getByRole("button", { name: "Reject" })).toBeVisible();
    expect(screen.getByText("Owner banned")).toBeVisible();
  });

  it("requires confirmation, prevents duplicate requests, and refreshes success", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminVendorsView
        state={state}
        vendors={{
          items: [vendor("PENDING")],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = screen.getByRole("dialog", { name: "Reject PENDING Store?" });
    expect(within(dialog).getByText(/cannot sell unless later approved/i)).toBeVisible();
    const confirm = within(dialog).getByRole("button", { name: "Confirm reject" });
    confirm.click();
    confirm.click();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/lifecycle"),
      expect.objectContaining({
        body: JSON.stringify({ action: "reject" }),
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
      }),
    );
    resolveResponse(Response.json({ data: { status: "REJECTED" }, success: true }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("keeps the confirmation open and reports stale transition errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Vendor is already approved", success: false }, { status: 409 }),
      ),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminVendorsView
        state={state}
        vendors={{
          items: [vendor("PENDING")],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Approve" }));
    const dialog = screen.getByRole("dialog");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm approve" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already approved");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("warns that approval does not restore a banned owner's access", async () => {
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminVendorsView
        state={state}
        vendors={{
          items: [vendor("SUSPENDED")],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "owner account remains banned and cannot sign in until separately unbanned",
    );
  });

  it("renders direct detail data and lifecycle recovery actions", () => {
    const summary = vendor("SUSPENDED");
    const detail: AdminVendorDetail = {
      ...summary,
      description: "Everyday essentials",
      storeBanner: "https://cdn.test/banner.jpg",
      storeLogo: null,
      updatedAt: "2026-08-10T08:00:00.000Z",
      user: {
        ...summary.user,
        avatar: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        isVerified: true,
      },
      userId: summary.user.id,
    };
    renderWithProviders(<AdminVendorDetailView vendor={detail} />);
    expect(screen.getByRole("heading", { name: "SUSPENDED Store" })).toBeVisible();
    expect(screen.getByText("Everyday essentials")).toBeVisible();
    expect(screen.getByText("Razorpay onboarding")).toBeVisible();
    expect(screen.getByText("Payment provider")).toBeVisible();
    expect(screen.getByRole("link", { name: "View banner" })).toHaveAttribute(
      "href",
      "https://cdn.test/banner.jpg",
    );
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  it("shows filtered empty and retryable error states", () => {
    const { rerender } = renderWithProviders(
      <AdminVendorsView
        state={{ ...state, status: "PENDING" }}
        vendors={{ items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No matching vendors" })).toBeVisible();
    rerender(<AdminVendorsView error="Vendors could not be loaded." state={state} />);
    expect(screen.getByRole("heading", { name: "Vendors unavailable" })).toBeVisible();
  });
});

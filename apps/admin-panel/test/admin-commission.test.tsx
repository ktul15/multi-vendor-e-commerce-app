import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCommissionView } from "../app/admin-commission-view";
import { AdminVendorDetailView } from "../app/admin-vendor-detail-view";
import type { AdminVendorDetail } from "../src/lib/vendor-data";

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

const vendor: AdminVendorDetail = {
  commissionRate: "12.50",
  createdAt: "2026-08-09T08:00:00.000Z",
  description: "Everyday essentials",
  id: "11111111-1111-4111-8111-111111111111",
  status: "APPROVED",
  storeBanner: null,
  storeLogo: null,
  storeName: "Asha Market",
  stripeOnboardingStatus: "COMPLETE",
  updatedAt: "2026-08-10T08:00:00.000Z",
  user: {
    avatar: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    email: "asha@example.test",
    id: "owner-1",
    isBanned: false,
    isVerified: true,
    name: "Asha",
  },
  userId: "owner-1",
};

describe("admin commission management", () => {
  it("differentiates the configured platform default and validates before confirmation", async () => {
    const fetch = vi.fn(async () => Response.json({ data: { rate: 15 }, success: true }));
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(<AdminCommissionView commission={{ rate: 10, source: "database" }} />);

    expect(screen.getByText("Admin configured")).toBeVisible();
    expect(screen.getByText("10.00%")).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "Edit rate" }));
    const dialog = screen.getByRole("dialog", { name: "Update commission rate" });
    const input = within(dialog).getByRole("spinbutton", { name: "Commission rate (%)" });
    await actor.clear(input);
    await actor.type(input, "101");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm rate" }));
    expect(within(dialog).getByText("Commission rate must be between 0 and 100.")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();

    await actor.clear(input);
    await actor.type(input, "15.25");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm rate" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      "/api/commission",
      expect.objectContaining({
        body: JSON.stringify({ rate: 15.25 }),
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
      }),
    );
  });

  it("shows an effective vendor override and confirms reset to the platform default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: { commissionRate: null }, success: true })),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminVendorDetailView
        defaultCommission={{ rate: 10, source: "database" }}
        vendor={vendor}
      />,
    );

    expect(screen.getByText("Vendor override")).toBeVisible();
    expect(screen.getByText("12.50%")).toBeVisible();
    expect(screen.getByText("Platform default: 10.00%")).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "Use platform default" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Asha Market override?" });
    expect(dialog).toHaveTextContent("current platform default of 10.00%");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm platform default" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      `/api/vendors/${vendor.id}/commission`,
      expect.objectContaining({ body: JSON.stringify({ rate: null }) }),
    );
  });

  it("keeps confirmation open and exposes failed vendor changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Commission update failed", success: false }, { status: 400 }),
      ),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminVendorDetailView
        defaultCommission={{ rate: 10, source: "database" }}
        vendor={vendor}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Edit override" }));
    const dialog = screen.getByRole("dialog");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm rate" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Commission update failed");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});

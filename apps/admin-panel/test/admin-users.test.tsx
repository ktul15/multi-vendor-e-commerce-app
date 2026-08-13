import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUserDetailView } from "../app/admin-user-detail-view";
import { AdminUsersView } from "../app/admin-users-view";
import type { AdminUser, AdminUserDetail } from "../src/lib/user-data";

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

const user: AdminUser = {
  createdAt: "2026-08-09T08:00:00.000Z",
  email: "asha@example.test",
  id: "11111111-1111-4111-8111-111111111111",
  isBanned: false,
  isVerified: true,
  name: "Asha Buyer",
  role: "CUSTOMER",
  vendorProfile: null,
};

const admin: AdminUser = {
  ...user,
  email: "admin@example.test",
  id: "22222222-2222-4222-8222-222222222222",
  name: "Platform Admin",
  role: "ADMIN",
};

const state = { page: 1, pageSize: 20, search: "" } as const;

describe("admin user management", () => {
  it("renders server results, URL filters, pagination, and protected admin controls", () => {
    renderWithProviders(
      <AdminUsersView
        state={state}
        users={{ items: [user, admin], meta: { limit: 20, page: 1, total: 25, totalPages: 2 } }}
      />,
    );

    expect(screen.getByRole("table", { name: "Admin user accounts" })).toHaveTextContent(
      "Asha Buyer",
    );
    expect(screen.getByRole("button", { name: "Ban" })).toBeVisible();
    expect(screen.getByText("Protected account")).toBeVisible();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      expect.stringContaining("page=2"),
    );
  });

  it("requires confirmation and surfaces invalid or stale transitions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "User is already banned", success: false }, { status: 409 }),
      ),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminUsersView
        state={state}
        users={{ items: [user], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } }}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Ban" }));
    const dialog = screen.getByRole("dialog", { name: "Ban Asha Buyer?" });
    expect(within(dialog).getByText(/unable to sign in/i)).toBeVisible();
    await actor.click(within(dialog).getByRole("button", { name: "Confirm ban" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already banned");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("prevents duplicate account-state requests before pending state renders", async () => {
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
      <AdminUsersView
        state={state}
        users={{ items: [user], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } }}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Ban" }));
    const confirm = screen.getByRole("button", { name: "Confirm ban" });
    confirm.click();
    confirm.click();
    expect(fetch).toHaveBeenCalledOnce();

    resolveResponse(Response.json({ data: { ...user, isBanned: true }, success: true }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("confirms an unban, forwards CSRF, and refreshes successful results", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        data: { ...user, isBanned: false },
        message: "User unbanned",
        success: true,
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(
      <AdminUsersView
        state={state}
        users={{
          items: [{ ...user, isBanned: true }],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Unban" }));
    await actor.click(screen.getByRole("button", { name: "Confirm unban" }));
    expect(fetch).toHaveBeenCalledWith(
      `/api/users/${user.id}/status`,
      expect.objectContaining({
        body: JSON.stringify({ action: "unban" }),
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
        method: "PATCH",
      }),
    );
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("renders complete account and vendor detail information", () => {
    const detail: AdminUserDetail = {
      ...user,
      avatar: null,
      role: "VENDOR",
      updatedAt: "2026-08-10T08:00:00.000Z",
      vendorProfile: {
        commissionRate: "12.50",
        createdAt: "2026-08-09T08:00:00.000Z",
        description: "Everyday essentials",
        id: "33333333-3333-4333-8333-333333333333",
        status: "APPROVED",
        storeBanner: null,
        storeLogo: null,
        storeName: "Asha Market",
        stripeOnboardingStatus: "COMPLETE",
        updatedAt: "2026-08-10T08:00:00.000Z",
        userId: user.id,
      },
    };
    renderWithProviders(<AdminUserDetailView user={detail} />);

    expect(screen.getByRole("heading", { name: "Asha Buyer" })).toBeVisible();
    expect(screen.getByText("Asha Market")).toBeVisible();
    expect(screen.getByText("12.50%")).toBeVisible();
    expect(screen.getByText("Everyday essentials")).toBeVisible();
  });

  it("shows a filtered empty state with a reset action", () => {
    renderWithProviders(
      <AdminUsersView
        state={{ ...state, role: "VENDOR" }}
        users={{ items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No matching users" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/users");
  });
});

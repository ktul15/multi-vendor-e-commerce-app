import { renderWithProviders } from "@repo/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorDashboardShell } from "../app/dashboard-shell";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => navigation,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  vi.unstubAllGlobals();
  navigation.refresh.mockReset();
  navigation.replace.mockReset();
  navigation.pathname = "/";
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    })),
  });
  document.cookie = "vendor_csrf_token=csrf-token; path=/";
});

describe("vendor dashboard logout", () => {
  it("sends the dashboard CSRF token and surfaces a failed logout", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(
      <VendorDashboardShell
        account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}
        profile={{ status: "APPROVED", storeName: "Maple Market" }}
      >
        <p>Dashboard content</p>
      </VendorDashboardShell>,
    );

    await user.click(screen.getByRole("button", { name: /Vendorvendor@example.test/i }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
      headers: { "X-CSRF-Token": "csrf-token" },
      method: "POST",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not sign you out");
  });

  it("navigates to login after successful logout", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(
      <VendorDashboardShell
        account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}
        profile={{ status: "APPROVED", storeName: "Maple Market" }}
      >
        <p>Dashboard content</p>
      </VendorDashboardShell>,
    );

    await user.click(screen.getByRole("button", { name: /Vendorvendor@example.test/i }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(navigation.replace).toHaveBeenCalledWith("/login");
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it.each([
    ["PENDING", "Your application is under review"],
    ["REJECTED", "Your vendor application was rejected"],
    ["SUSPENDED", "Your store access is paused"],
  ] as const)("renders the %s lifecycle gate without operational content", (status, title) => {
    renderWithProviders(
      <VendorDashboardShell
        account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}
        profile={{ status, storeName: "Maple Market" }}
      >
        <button type="button">Delete product</button>
      </VendorDashboardShell>,
    );

    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Delete product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Products" })).not.toBeInTheDocument();
  });

  it("shows approved status and renders operational content", () => {
    renderWithProviders(
      <VendorDashboardShell
        account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}
        profile={{ status: "APPROVED", storeName: "Maple Market" }}
      >
        <button type="button">Delete product</button>
      </VendorDashboardShell>,
    );

    expect(screen.getByText("Maple Market has full vendor access.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete product" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Products" })).toBeVisible();
  });

  it("lets pending vendors access store pages and refresh their status", async () => {
    navigation.pathname = "/store";
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <VendorDashboardShell
        account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}
        profile={{ status: "PENDING", storeName: "Maple Market" }}
      >
        <p>Store profile form</p>
      </VendorDashboardShell>,
    );

    expect(screen.getByText("Store profile form")).toBeVisible();
    expect(screen.getByRole("link", { name: "Store" })).toBeVisible();

    navigation.pathname = "/";
    rerender(
      <VendorDashboardShell
        account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}
        profile={{ status: "PENDING", storeName: "Maple Market" }}
      >
        <p>Operational dashboard</p>
      </VendorDashboardShell>,
    );
    await user.click(screen.getByRole("button", { name: "Refresh status" }));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});

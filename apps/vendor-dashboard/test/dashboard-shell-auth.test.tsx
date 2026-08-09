import { renderWithProviders } from "@repo/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorDashboardShell } from "../app/dashboard-shell";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => navigation,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  vi.unstubAllGlobals();
  navigation.refresh.mockReset();
  navigation.replace.mockReset();
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
      <VendorDashboardShell account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}>
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
      <VendorDashboardShell account={{ actions: [], email: "vendor@example.test", name: "Vendor" }}>
        <p>Dashboard content</p>
      </VendorDashboardShell>,
    );

    await user.click(screen.getByRole("button", { name: /Vendorvendor@example.test/i }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(navigation.replace).toHaveBeenCalledWith("/login");
    expect(navigation.refresh).toHaveBeenCalled();
  });
});

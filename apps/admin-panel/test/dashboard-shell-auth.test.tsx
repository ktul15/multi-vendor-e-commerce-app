import { renderWithProviders } from "@repo/test-utils";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardShell } from "../app/dashboard-shell";

const navigation = vi.hoisted(() => ({ pathname: "/", refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => navigation,
}));
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
  navigation.pathname = "/";
  navigation.refresh.mockReset();
  navigation.replace.mockReset();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    })),
  });
  document.cookie = "admin_csrf_token=admin-csrf; path=/";
});

function shell() {
  return renderWithProviders(
    <AdminDashboardShell account={{ actions: [], email: "admin@example.test", name: "Admin User" }}>
      <h1>Dashboard content</h1>
    </AdminDashboardShell>,
  );
}

describe("admin dashboard shell", () => {
  it("links every parity destination and exposes the responsive drawer", async () => {
    const user = userEvent.setup();
    shell();
    const navigationRegion = screen.getByRole("navigation", { name: "Admin Console navigation" });
    const destinations = {
      Banners: "/banners",
      Categories: "/categories",
      Dashboard: "/",
      Finance: "/finance",
      Orders: "/orders",
      Products: "/products",
      "Promo codes": "/promos",
      Settings: "/settings",
      Users: "/users",
      Vendors: "/vendors",
    };
    for (const [label, href] of Object.entries(destinations)) {
      expect(within(navigationRegion).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  });

  it("uses the admin CSRF cookie and navigates after logout", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    shell();

    await user.click(screen.getByRole("button", { name: /Admin Useradmin@example.test/i }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
      headers: { "X-CSRF-Token": "admin-csrf" },
      method: "POST",
    });
    expect(navigation.replace).toHaveBeenCalledWith("/login");
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("keeps protected content visible and reports a failed logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    const user = userEvent.setup();
    shell();

    await user.click(screen.getByRole("button", { name: /Admin Useradmin@example.test/i }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not sign you out");
    expect(screen.getByRole("heading", { name: "Dashboard content" })).toBeVisible();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

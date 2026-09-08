import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardError, DashboardShell } from "../src";
import type { DashboardAccount, DashboardNavItem } from "../src";

const navigation: readonly DashboardNavItem[] = [
  { href: "/", label: "Dashboard" },
  {
    children: [{ href: "/products/new", label: "Add product" }],
    href: "/products",
    label: "Products",
  },
];

const account: DashboardAccount = {
  name: "Test Vendor",
  email: "vendor@example.test",
  actions: [{ href: "/settings", label: "Account settings" }],
};

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      media: "(min-width: 75rem)",
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => vi.unstubAllGlobals());

function TestLink({
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  );
}

describe("DashboardShell", () => {
  it("marks nested navigation and breadcrumbs accessibly", () => {
    render(
      <DashboardShell
        account={account}
        brand="Vendor Hub"
        currentPath="/products/new"
        LinkComponent={TestLink}
        navigation={navigation}
      >
        Page content
      </DashboardShell>,
    );

    const primaryNavigation = screen.getByRole("navigation", { name: "Vendor Hub navigation" });
    const productsLink = within(primaryNavigation).getByRole("link", { name: "Products" });
    const childLink = within(primaryNavigation).getByRole("link", { name: "Add product" });

    expect(productsLink).toHaveClass("ui-shell-nav__link--active");
    expect(productsLink).not.toHaveAttribute("aria-current");
    expect(childLink).toHaveAttribute("aria-current", "page");
    expect(
      within(primaryNavigation).getByRole("button", { name: "Collapse Products navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Home/Products/Add product",
    );
  });

  it("makes children of an inactive navigation group discoverable", async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell
        account={account}
        brand="Vendor Hub"
        currentPath="/"
        LinkComponent={TestLink}
        navigation={navigation}
      >
        Page content
      </DashboardShell>,
    );

    expect(screen.queryByRole("link", { name: "Add product" })).not.toBeInTheDocument();
    const disclosure = screen.getByRole("button", { name: "Expand Products navigation" });
    await user.click(disclosure);

    expect(screen.getByRole("link", { name: "Add product" })).toBeVisible();
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps a nested section active on deeper routes without marking it as the current page", () => {
    render(
      <DashboardShell
        account={account}
        brand="Vendor Hub"
        currentPath="/products/new/preview"
        LinkComponent={TestLink}
        navigation={navigation}
      >
        Page content
      </DashboardShell>,
    );

    const primaryNavigation = screen.getByRole("navigation", { name: "Vendor Hub navigation" });
    const childLink = within(primaryNavigation).getByRole("link", { name: "Add product" });
    expect(childLink).toHaveClass("ui-shell-nav__link--active");
    expect(childLink).not.toHaveAttribute("aria-current");
  });

  it("uses unique disclosure targets when normalized navigation paths collide", () => {
    const collidingNavigation: readonly DashboardNavItem[] = [
      {
        children: [{ href: "/foo/bar/child", label: "Slash child" }],
        href: "/foo/bar",
        label: "Slash path",
      },
      {
        children: [{ href: "/foo-bar/child", label: "Hyphen child" }],
        href: "/foo-bar",
        label: "Hyphen path",
      },
    ];
    render(
      <DashboardShell
        account={account}
        brand="Vendor Hub"
        currentPath="/"
        LinkComponent={TestLink}
        navigation={collidingNavigation}
      >
        Page content
      </DashboardShell>,
    );

    const primaryNavigation = screen.getByRole("navigation", { name: "Vendor Hub navigation" });
    const slashTarget = within(primaryNavigation)
      .getByRole("button", { name: "Expand Slash path navigation" })
      .getAttribute("aria-controls");
    const hyphenTarget = within(primaryNavigation)
      .getByRole("button", { name: "Expand Hyphen path navigation" })
      .getAttribute("aria-controls");
    expect(slashTarget).not.toBe(hyphenTarget);
  });

  it("opens the responsive drawer and closes it after navigation", async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell
        account={account}
        brand="Vendor Hub"
        currentPath="/products"
        LinkComponent={TestLink}
        navigation={navigation}
      >
        Page content
      </DashboardShell>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    await user.click(within(drawer).getByRole("link", { name: "Add product" }));

    expect(drawer).not.toHaveAttribute("open");
  });

  it("closes an open drawer when the viewport reaches desktop width", async () => {
    let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaListener = listener;
        },
        matches: false,
        media: "(min-width: 75rem)",
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(
      <DashboardShell
        account={account}
        brand="Vendor Hub"
        currentPath="/"
        LinkComponent={TestLink}
        navigation={navigation}
      >
        Page content
      </DashboardShell>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    act(() => mediaListener?.({ matches: true } as MediaQueryListEvent));

    await waitFor(() => expect(drawer).not.toHaveAttribute("open"));
  });

  it("supports account actions and Escape dismissal", async () => {
    const user = userEvent.setup();
    const signOut = vi.fn();
    const accountWithCommand: DashboardAccount = {
      ...account,
      actions: [...account.actions, { label: "Sign out", onSelect: signOut }],
    };
    render(
      <DashboardShell
        account={accountWithCommand}
        brand="Vendor Hub"
        currentPath="/"
        LinkComponent={TestLink}
        navigation={navigation}
      >
        Page content
      </DashboardShell>,
    );

    const accountButton = screen.getByRole("button", { name: /Test Vendor/ });
    await user.click(accountButton);
    const settingsLink = screen.getByRole("link", { name: "Account settings" });
    expect(settingsLink).toBeVisible();
    expect(accountButton).not.toHaveAttribute("aria-haspopup");
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

    await user.tab();
    expect(settingsLink).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();

    await user.click(accountButton);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Account settings" })).not.toBeInTheDocument();
    expect(accountButton).toHaveFocus();
  });

  it("exposes a retry action for route errors", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<DashboardError reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

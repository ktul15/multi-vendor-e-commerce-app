"use client";

import { DashboardShell } from "@repo/ui";
import type { DashboardAccount, DashboardNavItem } from "@repo/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

const navigation: readonly DashboardNavItem[] = [
  { href: "/", icon: "⌂", label: "Dashboard" },
  { href: "/categories", icon: "⌗", label: "Categories" },
  { href: "/users", icon: "○", label: "Users" },
  { href: "/vendors", icon: "◇", label: "Vendors" },
  { href: "/products", icon: "□", label: "Products" },
  { href: "/orders", icon: "≡", label: "Orders" },
  { href: "/finance", icon: "₹", label: "Finance" },
  { href: "/banners", icon: "▣", label: "Banners" },
  { href: "/promos", icon: "%", label: "Promo codes" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export function AdminDashboardShell({
  account,
  children,
}: Readonly<{ account: DashboardAccount; children: ReactNode }>) {
  const currentPath = usePathname();
  const router = useRouter();
  const logoutInFlight = useRef(false);
  const [logoutError, setLogoutError] = useState<string>();

  const logout = async () => {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setLogoutError(undefined);
    const csrfToken = document.cookie
      .split(";")
      .map((entry) => entry.trim().split("="))
      .find(([name]) => name === "admin_csrf_token")
      ?.slice(1)
      .join("=");
    try {
      const response = await fetch("/api/auth/logout", {
        headers: csrfToken ? { "X-CSRF-Token": decodeURIComponent(csrfToken) } : {},
        method: "POST",
      });
      if (!response.ok) throw new Error("Unable to sign out");
      const destination = response.url
        ? `${new URL(response.url).pathname}${new URL(response.url).search}`
        : "/login";
      router.replace(destination);
      router.refresh();
    } catch {
      setLogoutError("We could not sign you out. Please try again.");
    } finally {
      logoutInFlight.current = false;
    }
  };

  const shellAccount: DashboardAccount = {
    ...account,
    actions: [...account.actions, { label: "Sign out", onSelect: () => void logout() }],
  };

  return (
    <>
      {logoutError ? (
        <p className="admin-logout-error" role="alert">
          {logoutError}
        </p>
      ) : null}
      <DashboardShell
        account={shellAccount}
        brand="Admin Console"
        currentPath={currentPath}
        LinkComponent={Link}
        navigation={navigation}
      >
        {children}
      </DashboardShell>
    </>
  );
}

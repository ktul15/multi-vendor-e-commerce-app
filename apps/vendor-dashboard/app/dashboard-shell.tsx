"use client";

import { DashboardShell } from "@repo/ui";
import type { DashboardAccount, DashboardNavItem } from "@repo/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { canRenderVendorRoute } from "../src/lib/vendor-access";
import type { VendorAccessProfile } from "../src/lib/vendor-access";
import { ApprovedVendorNotice, VendorStatusGate } from "./vendor-status-gate";

const operationalNavigation: readonly DashboardNavItem[] = [
  { href: "/", icon: "⌂", label: "Dashboard" },
  {
    children: [{ href: "/products/new", label: "Add product" }],
    href: "/products",
    icon: "□",
    label: "Products",
  },
  { href: "/orders", icon: "≡", label: "Orders" },
  { href: "/earnings", icon: "₹", label: "Earnings" },
  { href: "/store", icon: "◇", label: "Store" },
];

export function VendorDashboardShell({
  account,
  children,
  profile,
}: Readonly<{
  account: DashboardAccount;
  children: ReactNode;
  profile: VendorAccessProfile;
}>) {
  const currentPath = usePathname();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState<string>();

  const logout = async () => {
    setLogoutError(undefined);
    const csrfToken = document.cookie
      .split(";")
      .map((entry) => entry.trim().split("="))
      .find(([name]) => name === "vendor_csrf_token")
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
    }
  };

  const shellAccount: DashboardAccount = {
    ...account,
    actions: [...account.actions, { label: "Sign out", onSelect: () => void logout() }],
  };
  const navigation =
    profile.status === "APPROVED"
      ? operationalNavigation
      : [{ href: "/store", icon: "◇", label: "Store" }];
  const canRenderRoute = canRenderVendorRoute(profile.status, currentPath);

  return (
    <>
      {logoutError ? (
        <p className="vendor-logout-error" role="alert">
          {logoutError}
        </p>
      ) : null}
      <DashboardShell
        account={shellAccount}
        brand="Vendor Hub"
        currentPath={currentPath}
        LinkComponent={Link}
        navigation={navigation}
      >
        {profile.status === "APPROVED" ? (
          <>
            <ApprovedVendorNotice storeName={profile.storeName} />
            {children}
          </>
        ) : canRenderRoute ? (
          children
        ) : (
          <VendorStatusGate profile={profile} />
        )}
      </DashboardShell>
    </>
  );
}

"use client";

import { DashboardShell } from "@repo/ui";
import type { DashboardAccount, DashboardNavItem } from "@repo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation: readonly DashboardNavItem[] = [
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
}: Readonly<{ account: DashboardAccount; children: ReactNode }>) {
  const currentPath = usePathname();

  return (
    <DashboardShell
      account={account}
      brand="Vendor Hub"
      currentPath={currentPath}
      LinkComponent={Link}
      navigation={navigation}
    >
      {children}
    </DashboardShell>
  );
}

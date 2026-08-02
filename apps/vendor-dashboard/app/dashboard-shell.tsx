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

const account: DashboardAccount = {
  name: "Demo Vendor",
  email: "vendor@example.test",
  actions: [
    { href: "/store", label: "Store profile" },
    { href: "/settings", label: "Account settings" },
  ],
};

export function VendorDashboardShell({ children }: Readonly<{ children: ReactNode }>) {
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

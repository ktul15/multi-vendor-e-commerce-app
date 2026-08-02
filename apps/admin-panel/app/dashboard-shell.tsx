"use client";

import { DashboardShell } from "@repo/ui";
import type { DashboardAccount, DashboardNavItem } from "@repo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation: readonly DashboardNavItem[] = [
  { href: "/", icon: "⌂", label: "Dashboard" },
  { href: "/users", icon: "○", label: "Users" },
  { href: "/vendors", icon: "◇", label: "Vendors" },
  { href: "/products", icon: "□", label: "Products" },
  { href: "/categories", icon: "⌗", label: "Categories" },
  {
    children: [
      { href: "/marketing/banners", label: "Banners" },
      { href: "/marketing/promotions", label: "Promo codes" },
    ],
    href: "/marketing",
    icon: "✦",
    label: "Marketing",
    navigationOnly: true,
  },
  { href: "/finance", icon: "₹", label: "Finance" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

const account: DashboardAccount = {
  name: "Demo Admin",
  email: "admin@example.test",
  actions: [{ href: "/settings", label: "Account settings" }],
};

export function AdminDashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const currentPath = usePathname();

  return (
    <DashboardShell
      account={account}
      brand="Admin Console"
      currentPath={currentPath}
      LinkComponent={Link}
      navigation={navigation}
    >
      {children}
    </DashboardShell>
  );
}

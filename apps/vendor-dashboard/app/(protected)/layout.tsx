import type { DashboardAccount } from "@repo/ui";
import type { ReactNode } from "react";
import { VendorDashboardShell } from "../dashboard-shell";
import { requireVendorSession } from "../../src/lib/session";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireVendorSession();
  const account: DashboardAccount = {
    actions: [
      { href: "/store", label: "Store profile" },
      { href: "/settings", label: "Account settings" },
    ],
    email: session.email,
    name: session.name,
  };
  return <VendorDashboardShell account={account}>{children}</VendorDashboardShell>;
}

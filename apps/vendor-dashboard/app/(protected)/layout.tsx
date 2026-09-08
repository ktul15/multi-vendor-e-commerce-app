import type { DashboardAccount } from "@repo/ui";
import type { ReactNode } from "react";
import { VendorDashboardShell } from "../dashboard-shell";
import { requireVendorSession } from "../../src/lib/session";
import { getVendorAccessProfile } from "../../src/lib/vendor-profile";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [session, profile] = await Promise.all([requireVendorSession(), getVendorAccessProfile()]);
  const account: DashboardAccount = {
    actions:
      profile.status === "APPROVED"
        ? [
            { href: "/store", label: "Store profile" },
            { href: "/settings", label: "Account settings" },
          ]
        : [{ href: "/store", label: "Store profile" }],
    email: session.email,
    name: session.name,
  };
  return (
    <VendorDashboardShell account={account} profile={profile}>
      {children}
    </VendorDashboardShell>
  );
}

import type { DashboardAccount } from "@repo/ui";
import type { ReactNode } from "react";
import { AdminDashboardShell } from "../dashboard-shell";
import { requireAdminSession } from "../../src/lib/session";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireAdminSession();
  const account: DashboardAccount = {
    actions: [],
    email: session.email,
    name: session.name,
  };
  return <AdminDashboardShell account={account}>{children}</AdminDashboardShell>;
}

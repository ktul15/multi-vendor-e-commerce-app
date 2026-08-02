import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@repo/ui/styles.css";
import "./globals.css";
import { AdminDashboardShell } from "./dashboard-shell";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Operate and moderate the multi-vendor marketplace.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AdminDashboardShell>{children}</AdminDashboardShell>
      </body>
    </html>
  );
}

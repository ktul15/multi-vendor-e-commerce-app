import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@repo/ui/styles.css";
import "./globals.css";
import { VendorDashboardShell } from "./dashboard-shell";

export const metadata: Metadata = {
  title: "Vendor Dashboard",
  description: "Manage products, orders, earnings, and store settings.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <VendorDashboardShell>{children}</VendorDashboardShell>
      </body>
    </html>
  );
}

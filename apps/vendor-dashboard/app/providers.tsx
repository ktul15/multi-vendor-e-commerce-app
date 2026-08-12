"use client";

import { DashboardQueryProvider } from "@repo/query";
import type { ReactNode } from "react";
import { VendorDataCoherence } from "./vendor-data-coherence";

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DashboardQueryProvider>
      <VendorDataCoherence />
      {children}
    </DashboardQueryProvider>
  );
}

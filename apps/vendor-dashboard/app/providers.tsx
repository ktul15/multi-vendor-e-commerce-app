"use client";

import { DashboardQueryProvider } from "@repo/query";
import type { ReactNode } from "react";

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return <DashboardQueryProvider>{children}</DashboardQueryProvider>;
}

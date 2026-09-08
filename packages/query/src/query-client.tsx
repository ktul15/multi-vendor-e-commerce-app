"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { createDashboardQueryClient } from "./query-core";

export function DashboardQueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(createDashboardQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

"use client";

import { DashboardError } from "@repo/ui";

export default function ProtectedError({ reset }: Readonly<{ reset: () => void }>) {
  return <DashboardError reset={reset} />;
}

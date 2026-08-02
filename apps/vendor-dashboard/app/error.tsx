"use client";

import { DashboardError } from "@repo/ui";

export default function Error({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <DashboardError reset={reset} />;
}

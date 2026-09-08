"use client";

import { DashboardError } from "@repo/ui";
import { reportClientRenderError } from "@repo/observability";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => reportClientRenderError(error), [error]);
  return <DashboardError reset={reset} />;
}

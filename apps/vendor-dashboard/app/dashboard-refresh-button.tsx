"use client";

import { Button } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DashboardRefreshButton() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  return (
    <Button
      loading={refreshing}
      loadingLabel="Refreshing dashboard"
      onClick={() => startRefresh(() => router.refresh())}
      variant="secondary"
    >
      Try again
    </Button>
  );
}

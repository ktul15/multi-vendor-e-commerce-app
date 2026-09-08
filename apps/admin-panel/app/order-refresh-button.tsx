"use client";

import { Button } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderRefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <Button
      loading={refreshing}
      loadingLabel="Refreshing order data"
      onClick={() => {
        setRefreshing(true);
        router.refresh();
        globalThis.setTimeout(() => setRefreshing(false), 500);
      }}
      size="sm"
      variant="secondary"
    >
      Refresh
    </Button>
  );
}

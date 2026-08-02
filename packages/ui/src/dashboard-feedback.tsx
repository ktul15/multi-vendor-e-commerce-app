"use client";

import { Button } from "./button";
import { ErrorState } from "./states";
import { Skeleton, SkeletonRegion } from "./skeleton";

export function DashboardLoading({ label = "Loading dashboard" }: Readonly<{ label?: string }>) {
  return (
    <SkeletonRegion label={label}>
      <div className="ui-dashboard-loading">
        <Skeleton height="2rem" width="35%" />
        <div className="ui-showcase__grid ui-showcase__grid--three">
          <Skeleton height="9rem" />
          <Skeleton height="9rem" />
          <Skeleton height="9rem" />
        </div>
        <Skeleton height="18rem" />
      </div>
    </SkeletonRegion>
  );
}

export function DashboardError({
  message = "The dashboard could not be loaded. Try again.",
  reset,
}: Readonly<{ message?: string; reset: () => void }>) {
  return (
    <ErrorState
      action={<Button onClick={reset}>Try again</Button>}
      description={message}
      title="Something went wrong"
    />
  );
}

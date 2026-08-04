import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 30_000;
const GARBAGE_COLLECTION_MS = 5 * 60_000;
const MAX_QUERY_RETRIES = 2;

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

export function isRetryableQueryError(error: unknown): boolean {
  const status = errorStatus(error);
  return status === undefined || status === 0 || status === 408 || status === 429 || status >= 500;
}

export const dashboardQueryDefaults = {
  queries: {
    gcTime: GARBAGE_COLLECTION_MS,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: (failureCount: number, error: unknown) =>
      failureCount < MAX_QUERY_RETRIES && isRetryableQueryError(error),
    staleTime: STALE_TIME_MS,
  },
  mutations: {
    retry: false,
  },
} as const;

export function createDashboardQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: dashboardQueryDefaults });
}

export function createServerQueryClient(): QueryClient {
  return createDashboardQueryClient();
}

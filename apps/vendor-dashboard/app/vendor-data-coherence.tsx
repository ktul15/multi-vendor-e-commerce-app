"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import {
  invalidateVendorQueries,
  publishVendorDataChange,
  subscribeToVendorDataChanges,
} from "../src/lib/vendor-data-sync";
import type { VendorDataScope } from "../src/lib/vendor-data-sync";

const allScopes = ["dashboard", "inventory", "orders", "profile", "session"] as const;
const focusRefreshIntervalMs = 30_000;

export function VendorDataCoherence() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const lastFocusRefresh = useRef(0);
  const [, startTransition] = useTransition();

  const refresh = useCallback(
    (scopes: readonly VendorDataScope[]) => {
      void invalidateVendorQueries(queryClient, scopes);
      startTransition(() => router.refresh());
    },
    [queryClient, router],
  );

  useEffect(() => subscribeToVendorDataChanges(refresh), [refresh]);
  useEffect(() => {
    const refreshAfterAbsence = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastFocusRefresh.current < focusRefreshIntervalMs) return;
      lastFocusRefresh.current = now;
      refresh(allScopes);
    };
    window.addEventListener("focus", refreshAfterAbsence);
    document.addEventListener("visibilitychange", refreshAfterAbsence);
    return () => {
      window.removeEventListener("focus", refreshAfterAbsence);
      document.removeEventListener("visibilitychange", refreshAfterAbsence);
    };
  }, [refresh]);

  return null;
}

export function useVendorDataRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(
    async (scopes: readonly VendorDataScope[]) => {
      await invalidateVendorQueries(queryClient, scopes);
      publishVendorDataChange(scopes);
      router.refresh();
    },
    [queryClient, router],
  );
}

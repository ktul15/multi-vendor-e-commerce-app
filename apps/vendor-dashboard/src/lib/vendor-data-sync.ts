import type { QueryClient } from "@tanstack/react-query";

export type VendorDataScope = "dashboard" | "inventory" | "orders" | "profile" | "session";

export const vendorQueryKeys: Readonly<Record<VendorDataScope, readonly string[]>> = {
  dashboard: ["vendor", "dashboard"],
  inventory: ["vendor", "inventory"],
  orders: ["vendor", "orders"],
  profile: ["vendor", "profile"],
  session: ["vendor", "session"],
};

const channelName = "vendor-dashboard-data";
const storageKey = "vendor-dashboard:data-change";
const validScopes = new Set<VendorDataScope>(Object.keys(vendorQueryKeys) as VendorDataScope[]);
let tabId: string | undefined;

type VendorDataChange = Readonly<{
  id: string;
  origin: string;
  scopes: readonly VendorDataScope[];
  timestamp: number;
}>;

function currentTabId(): string {
  tabId ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return tabId;
}

function message(scopes: readonly VendorDataScope[]): VendorDataChange {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    origin: currentTabId(),
    scopes: [...new Set(scopes)],
    timestamp: Date.now(),
  };
}

function parseMessage(value: unknown): VendorDataChange | undefined {
  if (typeof value !== "object" || value === null || !("scopes" in value)) return undefined;
  const scopes = Array.isArray(value.scopes)
    ? value.scopes.filter((scope): scope is VendorDataScope => validScopes.has(scope))
    : [];
  if (scopes.length === 0) return undefined;
  return {
    id: "id" in value && typeof value.id === "string" ? value.id : "unknown",
    origin: "origin" in value && typeof value.origin === "string" ? value.origin : "unknown",
    scopes,
    timestamp:
      "timestamp" in value && typeof value.timestamp === "number" ? value.timestamp : Date.now(),
  };
}

export async function invalidateVendorQueries(
  queryClient: QueryClient,
  scopes: readonly VendorDataScope[],
): Promise<void> {
  await Promise.all(
    [...new Set(scopes)].map((scope) =>
      queryClient.invalidateQueries({ queryKey: vendorQueryKeys[scope] }),
    ),
  );
}

export function publishVendorDataChange(scopes: readonly VendorDataScope[]): void {
  if (typeof window === "undefined" || scopes.length === 0) return;
  const change = message(scopes);
  if (typeof BroadcastChannel === "function") {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(change);
    channel.close();
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(change));
  } catch {
    // Cross-tab synchronization is best effort when browser storage is unavailable.
  }
}

export function subscribeToVendorDataChanges(
  listener: (scopes: readonly VendorDataScope[]) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (typeof BroadcastChannel === "function") {
    const channel = new BroadcastChannel(channelName);
    channel.addEventListener("message", (event) => {
      const change = parseMessage(event.data);
      if (change && change.origin !== currentTabId()) listener(change.scopes);
    });
    return () => channel.close();
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const change = parseMessage(JSON.parse(event.newValue));
      if (change && change.origin !== currentTabId()) listener(change.scopes);
    } catch {
      // Ignore malformed values written by older or unrelated clients.
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  invalidateVendorQueries,
  publishVendorDataChange,
  subscribeToVendorDataChanges,
  vendorQueryKeys,
} from "../src/lib/vendor-data-sync";

class BroadcastChannelMock {
  static instances: BroadcastChannelMock[] = [];
  readonly listeners: Array<(event: MessageEvent) => void> = [];
  readonly messages: unknown[] = [];
  closed = false;

  constructor(readonly name: string) {
    BroadcastChannelMock.instances.push(this);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  close() {
    this.closed = true;
  }

  postMessage(value: unknown) {
    this.messages.push(value);
  }

  dispatch(value: unknown) {
    for (const listener of this.listeners) listener(new MessageEvent("message", { data: value }));
  }
}

afterEach(() => {
  BroadcastChannelMock.instances = [];
  vi.unstubAllGlobals();
});

describe("vendor data synchronization", () => {
  it("invalidates only the authoritative query scopes affected by a mutation", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData([...vendorQueryKeys.inventory, "page-1"], { items: [] });
    queryClient.setQueryData([...vendorQueryKeys.orders, "page-1"], { items: [] });

    await invalidateVendorQueries(queryClient, ["inventory"]);

    expect(queryClient.getQueryState([...vendorQueryKeys.inventory, "page-1"])?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState([...vendorQueryKeys.orders, "page-1"])?.isInvalidated).toBe(
      false,
    );
  });

  it("publishes mutation scopes for other tabs", () => {
    vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);

    publishVendorDataChange(["orders", "dashboard"]);

    const publisher = BroadcastChannelMock.instances[0]!;
    expect(publisher.name).toBe("vendor-dashboard-data");
    expect(publisher.messages).toHaveLength(1);
    expect(publisher.messages[0]).toMatchObject({ scopes: ["orders", "dashboard"] });
    expect(publisher.closed).toBe(true);
  });

  it("receives valid remote scopes and ignores unknown ones", () => {
    vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
    const listener = vi.fn();
    const unsubscribe = subscribeToVendorDataChanges(listener);
    const subscriber = BroadcastChannelMock.instances[0]!;

    subscriber.dispatch({ scopes: ["inventory", "unknown"] });

    expect(listener).toHaveBeenCalledWith(["inventory"]);
    unsubscribe();
    expect(subscriber.closed).toBe(true);
  });

  it("ignores a broadcast produced by the same tab", () => {
    vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
    const listener = vi.fn();
    const unsubscribe = subscribeToVendorDataChanges(listener);
    const subscriber = BroadcastChannelMock.instances[0]!;
    publishVendorDataChange(["orders"]);
    const publisher = BroadcastChannelMock.instances[1]!;

    subscriber.dispatch(publisher.messages[0]);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

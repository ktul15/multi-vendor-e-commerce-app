import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorDataCoherence } from "../app/vendor-data-coherence";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

class BroadcastChannelMock {
  static instances: BroadcastChannelMock[] = [];
  readonly listeners: Array<(event: MessageEvent) => void> = [];

  constructor(readonly name: string) {
    BroadcastChannelMock.instances.push(this);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  close() {}
  postMessage() {}

  dispatch(value: unknown) {
    for (const listener of this.listeners) listener(new MessageEvent("message", { data: value }));
  }
}

beforeEach(() => {
  BroadcastChannelMock.instances = [];
  navigation.refresh.mockReset();
  vi.restoreAllMocks();
  vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
});

describe("vendor data coherence", () => {
  it("refreshes authoritative server data after another tab changes session or orders", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    render(
      <QueryClientProvider client={queryClient}>
        <VendorDataCoherence />
      </QueryClientProvider>,
    );
    const channel = BroadcastChannelMock.instances[0]!;

    act(() => channel.dispatch({ scopes: ["session", "orders"] }));

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("revalidates once when a tab regains focus after the freshness window", async () => {
    vi.spyOn(Date, "now").mockReturnValue(31_000);
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <VendorDataCoherence />
      </QueryClientProvider>,
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });
});

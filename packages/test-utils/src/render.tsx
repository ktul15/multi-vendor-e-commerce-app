import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: Number.POSITIVE_INFINITY, retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: Omit<RenderOptions, "wrapper"> & Readonly<{ queryClient?: QueryClient }> = {},
): RenderResult & Readonly<{ queryClient: QueryClient }> {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}

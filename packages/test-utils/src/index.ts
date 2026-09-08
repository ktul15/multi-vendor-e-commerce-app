export function createTestId(prefix: string, id: string): string {
  return `${prefix}-${id}`;
}

export { createJsonHandler, createTestServer } from "./msw";
export { createTestQueryClient, renderWithProviders } from "./render";

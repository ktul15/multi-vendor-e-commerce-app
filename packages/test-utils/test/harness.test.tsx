import { useQuery } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createJsonHandler, createTestServer, renderWithProviders } from "../src";

const server = createTestServer(
  createJsonHandler("get", "https://api.example.test/products", {
    data: [{ id: "product-1", name: "Cotton shirt" }],
    success: true,
  }),
);

function QueryExample() {
  const products = useQuery({
    queryFn: async () => {
      const response = await fetch("https://api.example.test/products");
      return (await response.json()) as { data: Array<{ id: string; name: string }> };
    },
    queryKey: ["example", "products"],
  });
  if (products.isPending) return <p>Loading products</p>;
  if (products.isError) return <p>Could not load products</p>;
  return <p>{products.data.data[0]?.name}</p>;
}

describe("shared test harness", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("renders Query components against deterministic MSW handlers", async () => {
    const { queryClient } = renderWithProviders(<QueryExample />);

    expect(screen.getByText("Loading products")).toBeVisible();
    expect(await screen.findByText("Cotton shirt")).toBeVisible();
    expect(queryClient.getQueryData(["example", "products"])).toEqual({
      data: [{ id: "product-1", name: "Cotton shirt" }],
      success: true,
    });
  });
});

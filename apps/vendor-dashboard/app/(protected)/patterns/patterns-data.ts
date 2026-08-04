import { queryOptions } from "@tanstack/react-query";
import { parseTableUrlState, serializeTableUrlState } from "@repo/schemas";
import type { TableUrlState } from "@repo/schemas";

export type ExampleProduct = Readonly<{
  id: string;
  name: string;
  sku: string;
  status: "active" | "draft";
}>;

export type PatternSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

const products: readonly ExampleProduct[] = [
  { id: "1", name: "Cotton shirt", sku: "SHIRT-001", status: "active" },
  { id: "2", name: "Canvas backpack", sku: "BAG-002", status: "draft" },
  { id: "3", name: "Ceramic mug", sku: "MUG-003", status: "active" },
  { id: "4", name: "Wool scarf", sku: "SCARF-004", status: "draft" },
];

export const patternTableOptions = {
  defaultPageSize: 2,
  filterKeys: ["status"],
  maxFilterLength: 32,
  maxPage: 1_000,
  maxSearchLength: 100,
  pageSizes: [2, 10, 25],
  sortFields: ["name", "sku", "status"],
} as const;

function toUrlSearchParams(input: PatternSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (value) {
      for (const item of value) params.append(key, item);
    }
  }
  params.sort();
  return params;
}

export function canonicalizePatternSearchParams(input: PatternSearchParams): Readonly<{
  canonicalQuery: string;
  shouldRedirect: boolean;
  state: TableUrlState;
}> {
  const received = toUrlSearchParams(input);
  const state = parseTableUrlState(input, patternTableOptions);
  const canonicalQuery = serializeTableUrlState(state).toString();
  return {
    canonicalQuery,
    shouldRedirect: received.size > 0 && received.toString() !== canonicalQuery,
    state,
  };
}

export function exampleProductsQuery(state: TableUrlState) {
  return queryOptions({
    queryFn: async () => {
      await Promise.resolve();
      const status = state.columnFilters.find((filter) => filter.id === "status")?.value;
      const term = state.search.toLowerCase();
      const sorting = state.sorting[0];
      const filtered = products
        .filter((product) => !status || product.status === status)
        .filter((product) =>
          term ? `${product.name} ${product.sku}`.toLowerCase().includes(term) : true,
        )
        .toSorted((left, right) => {
          if (!sorting) return 0;
          const leftValue = left[sorting.id as keyof ExampleProduct];
          const rightValue = right[sorting.id as keyof ExampleProduct];
          const comparison = String(leftValue).localeCompare(String(rightValue));
          return sorting.desc ? -comparison : comparison;
        });
      const start = state.pagination.pageIndex * state.pagination.pageSize;
      return {
        pageCount: Math.ceil(filtered.length / state.pagination.pageSize),
        rows: filtered.slice(start, start + state.pagination.pageSize),
      };
    },
    queryKey: ["foundation-example", "products", state],
  });
}

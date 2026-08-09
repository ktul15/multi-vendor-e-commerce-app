import { parseTableUrlState } from "@repo/schemas";

export const productSortFields = ["createdAt", "updatedAt", "name", "basePrice"] as const;
export type ProductSortField = (typeof productSortFields)[number];

export type ProductListSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export type ProductListState = Readonly<{
  inStock?: boolean;
  isActive?: boolean;
  page: number;
  pageSize: number;
  search: string;
  sortBy: ProductSortField;
  sortOrder: "asc" | "desc";
}>;

const tableOptions = {
  defaultPageSize: 10,
  filterKeys: ["isActive", "inStock"],
  maxFilterLength: 5,
  maxPage: 10_000,
  maxSearchLength: 100,
  pageSizes: [10, 25, 50],
  sortFields: productSortFields,
} as const;

function booleanFilter(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseProductListState(searchParams: ProductListSearchParams): ProductListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const sorting = table.sorting[0];
  const filter = (id: string) => table.columnFilters.find((entry) => entry.id === id)?.value;
  return {
    inStock: booleanFilter(filter("inStock")),
    isActive: booleanFilter(filter("isActive")),
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    search: table.search,
    sortBy: (sorting?.id as ProductSortField | undefined) ?? "createdAt",
    sortOrder: sorting?.desc === false ? "asc" : "desc",
  };
}

export function productListHref(
  state: ProductListState,
  updates: Partial<ProductListState> = {},
): string {
  const next = { ...state, ...updates };
  const params = new URLSearchParams({
    direction: next.sortOrder,
    page: String(next.page),
    pageSize: String(next.pageSize),
    sort: next.sortBy,
  });
  if (next.search) params.set("search", next.search);
  if (next.isActive !== undefined) params.set("filter.isActive", String(next.isActive));
  if (next.inStock !== undefined) params.set("filter.inStock", String(next.inStock));
  params.sort();
  return `/products?${params.toString()}`;
}

export function productInventoryQuery(state: ProductListState) {
  return {
    inStock: state.inStock,
    isActive: state.isActive,
    limit: state.pageSize,
    page: state.page,
    search: state.search || undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
}

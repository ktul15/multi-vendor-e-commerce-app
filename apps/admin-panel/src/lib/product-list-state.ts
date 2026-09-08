import { parseTableUrlState } from "@repo/schemas";

export const productStatuses = ["active", "inactive"] as const;
export type ProductStatus = (typeof productStatuses)[number];
export type ProductListSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;
export type ProductListState = Readonly<{
  categoryId?: string;
  page: number;
  pageSize: number;
  search: string;
  status?: ProductStatus;
  vendorId?: string;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tableOptions = {
  defaultPageSize: 20,
  filterKeys: ["status", "vendorId", "categoryId"],
  maxFilterLength: 64,
  maxPage: 10_000,
  maxSearchLength: 100,
  pageSizes: [10, 20, 50],
  sortFields: ["createdAt"],
} as const;

export function parseProductListState(searchParams: ProductListSearchParams): ProductListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const filter = (id: string) => table.columnFilters.find((entry) => entry.id === id)?.value;
  const statusValue = filter("status");
  const vendorId = filter("vendorId");
  const categoryId = filter("categoryId");
  return {
    categoryId: categoryId && uuidPattern.test(categoryId) ? categoryId : undefined,
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    search: table.search,
    status: productStatuses.find((status) => status === statusValue),
    vendorId: vendorId && uuidPattern.test(vendorId) ? vendorId : undefined,
  };
}

export function productListHref(
  state: ProductListState,
  updates: Partial<ProductListState> = {},
): string {
  const next = { ...state, ...updates };
  const params = new URLSearchParams({
    page: String(next.page),
    pageSize: String(next.pageSize),
    sort: "createdAt",
  });
  if (next.search) params.set("search", next.search);
  if (next.status) params.set("filter.status", next.status);
  if (next.vendorId) params.set("filter.vendorId", next.vendorId);
  if (next.categoryId) params.set("filter.categoryId", next.categoryId);
  params.sort();
  return `/products?${params.toString()}`;
}

export function productListQuery(state: ProductListState) {
  return {
    categoryId: state.categoryId,
    isActive: state.status === undefined ? undefined : state.status === "active",
    limit: state.pageSize,
    page: state.page,
    search: state.search || undefined,
    vendorId: state.vendorId,
  };
}

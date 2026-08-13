import { parseTableUrlState } from "@repo/schemas";

export const vendorStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type VendorStatus = (typeof vendorStatuses)[number];
export type VendorListSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;
export type VendorListState = Readonly<{
  page: number;
  pageSize: number;
  search: string;
  status?: VendorStatus;
}>;

const tableOptions = {
  defaultPageSize: 20,
  filterKeys: ["status"],
  maxFilterLength: 20,
  maxPage: 10_000,
  maxSearchLength: 100,
  pageSizes: [10, 20, 50],
  sortFields: ["createdAt"],
} as const;

export function parseVendorListState(searchParams: VendorListSearchParams): VendorListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const value = table.columnFilters.find((filter) => filter.id === "status")?.value;
  return {
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    search: table.search,
    status: vendorStatuses.find((status) => status === value),
  };
}

export function vendorListHref(
  state: VendorListState,
  updates: Partial<VendorListState> = {},
): string {
  const next = { ...state, ...updates };
  const params = new URLSearchParams({
    page: String(next.page),
    pageSize: String(next.pageSize),
    sort: "createdAt",
  });
  if (next.search) params.set("search", next.search);
  if (next.status) params.set("filter.status", next.status);
  params.sort();
  return `/vendors?${params.toString()}`;
}

export function vendorListQuery(state: VendorListState) {
  return {
    limit: state.pageSize,
    page: state.page,
    search: state.search || undefined,
    status: state.status,
  };
}

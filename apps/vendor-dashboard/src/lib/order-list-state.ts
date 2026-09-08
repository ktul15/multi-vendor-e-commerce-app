import { parseTableUrlState } from "@repo/schemas";

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export type OrderListSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export type OrderListState = Readonly<{
  page: number;
  pageSize: number;
  search: string;
  status?: OrderStatus;
}>;

const tableOptions = {
  defaultPageSize: 10,
  filterKeys: ["status"],
  maxFilterLength: 20,
  maxPage: 10_000,
  maxSearchLength: 100,
  pageSizes: [10, 25, 50],
  sortFields: ["createdAt"],
} as const;

export function parseOrderListState(searchParams: OrderListSearchParams): OrderListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const statusValue = table.columnFilters.find((entry) => entry.id === "status")?.value;
  const status = orderStatuses.find((entry) => entry === statusValue);
  return {
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    search: table.search,
    status,
  };
}

export function orderListHref(
  state: OrderListState,
  updates: Partial<OrderListState> = {},
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
  return `/orders?${params.toString()}`;
}

export function orderListQuery(state: OrderListState) {
  return {
    limit: state.pageSize,
    page: state.page,
    search: state.search || undefined,
    status: state.status,
  };
}

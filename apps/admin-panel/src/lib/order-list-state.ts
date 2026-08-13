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
  endDate?: string;
  page: number;
  pageSize: number;
  search: string;
  startDate?: string;
  status?: OrderStatus;
  userId?: string;
  vendorId?: string;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const tableOptions = {
  defaultPageSize: 20,
  filterKeys: ["status", "userId", "vendorId", "startDate", "endDate"],
  maxFilterLength: 64,
  maxPage: 10_000,
  maxSearchLength: 100,
  pageSizes: [10, 20, 50],
  sortFields: ["createdAt"],
} as const;

function validDate(value?: string): string | undefined {
  if (!value || !datePattern.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

export function parseOrderListState(searchParams: OrderListSearchParams): OrderListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const filter = (id: string) => table.columnFilters.find((entry) => entry.id === id)?.value;
  const statusValue = filter("status");
  const userId = filter("userId");
  const vendorId = filter("vendorId");
  return {
    endDate: validDate(filter("endDate")),
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    search: table.search,
    startDate: validDate(filter("startDate")),
    status: orderStatuses.find((status) => status === statusValue),
    userId: userId && uuidPattern.test(userId) ? userId : undefined,
    vendorId: vendorId && uuidPattern.test(vendorId) ? vendorId : undefined,
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
  if (next.userId) params.set("filter.userId", next.userId);
  if (next.vendorId) params.set("filter.vendorId", next.vendorId);
  if (next.startDate) params.set("filter.startDate", next.startDate);
  if (next.endDate) params.set("filter.endDate", next.endDate);
  params.sort();
  return `/orders?${params.toString()}`;
}

export function orderListQuery(state: OrderListState) {
  return {
    endDate: state.endDate ? `${state.endDate}T23:59:59.999Z` : undefined,
    limit: state.pageSize,
    page: state.page,
    search: state.search || undefined,
    startDate: state.startDate ? `${state.startDate}T00:00:00.000Z` : undefined,
    status: state.status,
    userId: state.userId,
    vendorId: state.vendorId,
  };
}

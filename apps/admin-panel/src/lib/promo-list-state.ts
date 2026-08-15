import { parseTableUrlState } from "@repo/schemas";

export type PromoDiscountType = "FIXED" | "PERCENTAGE";
export type PromoListSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;
export type PromoListState = Readonly<{
  discountType?: PromoDiscountType;
  isActive?: boolean;
  page: number;
  pageSize: number;
  search: string;
}>;

const tableOptions = {
  defaultPageSize: 20,
  filterKeys: ["discountType", "isActive"],
  maxFilterLength: 32,
  maxPage: 10_000,
  maxSearchLength: 30,
  pageSizes: [10, 20, 50],
  sortFields: ["createdAt"],
} as const;

export function parsePromoListState(searchParams: PromoListSearchParams): PromoListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const filter = (id: string) => table.columnFilters.find((entry) => entry.id === id)?.value;
  const discountType = filter("discountType");
  const active = filter("isActive");
  return {
    discountType:
      discountType === "FIXED" || discountType === "PERCENTAGE" ? discountType : undefined,
    isActive: active === "true" ? true : active === "false" ? false : undefined,
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    search: table.search,
  };
}

export function promoListHref(
  state: PromoListState,
  updates: Partial<PromoListState> = {},
): string {
  const next = { ...state, ...updates };
  const params = new URLSearchParams({
    page: String(next.page),
    pageSize: String(next.pageSize),
    sort: "createdAt",
  });
  if (next.search) params.set("search", next.search);
  if (next.discountType) params.set("filter.discountType", next.discountType);
  if (next.isActive !== undefined) params.set("filter.isActive", String(next.isActive));
  params.sort();
  return `/promos?${params.toString()}`;
}

export function promoListQuery(state: PromoListState) {
  return {
    discountType: state.discountType,
    isActive: state.isActive,
    limit: state.pageSize,
    page: state.page,
    search: state.search || undefined,
  };
}

import { parseTableUrlState } from "@repo/schemas";

export type BannerListSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;
export type BannerListState = Readonly<{ isActive?: boolean; page: number; pageSize: number }>;
const options = {
  defaultPageSize: 20,
  filterKeys: ["isActive"],
  maxPage: 10_000,
  pageSizes: [10, 20, 50],
  sortFields: ["position"],
} as const;

export function parseBannerListState(params: BannerListSearchParams): BannerListState {
  const table = parseTableUrlState(params, options);
  const active = table.columnFilters.find((entry) => entry.id === "isActive")?.value;
  return {
    isActive: active === "true" ? true : active === "false" ? false : undefined,
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
  };
}

export function bannerListHref(state: BannerListState, updates: Partial<BannerListState> = {}) {
  const next = { ...state, ...updates };
  const params = new URLSearchParams({
    page: String(next.page),
    pageSize: String(next.pageSize),
    sort: "position",
  });
  if (next.isActive !== undefined) params.set("filter.isActive", String(next.isActive));
  params.sort();
  return `/banners?${params.toString()}`;
}

export const bannerListQuery = (state: BannerListState) => ({
  isActive: state.isActive,
  limit: state.pageSize,
  page: state.page,
});

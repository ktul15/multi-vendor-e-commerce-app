import { z } from "zod";

export type TableSorting = Readonly<{ desc: boolean; id: string }>;
export type TableColumnFilter = Readonly<{ id: string; value: string }>;

export type TableUrlState = Readonly<{
  columnFilters: readonly TableColumnFilter[];
  pagination: Readonly<{ pageIndex: number; pageSize: number }>;
  search: string;
  sorting: readonly TableSorting[];
}>;

export type TableUrlOptions = Readonly<{
  defaultPageSize?: number;
  filterKeys?: readonly string[];
  maxFilterLength?: number;
  maxPage?: number;
  maxSearchLength?: number;
  pageSizes?: readonly number[];
  sortFields: readonly string[];
}>;

type SearchInput =
  | URLSearchParams
  | Readonly<Record<string, string | readonly string[] | undefined>>;

function read(input: SearchInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const value = input[key];
  if (typeof value === "string" || value === undefined) return value;
  return value[0];
}

export function parseTableUrlState(input: SearchInput, options: TableUrlOptions): TableUrlState {
  const positivePage = z.coerce
    .number()
    .int()
    .min(1)
    .max(options.maxPage ?? 10_000);
  const positivePageSize = z.coerce.number().int().min(1);
  const boundedSearch = z
    .string()
    .trim()
    .max(options.maxSearchLength ?? 100);
  const boundedFilter = z
    .string()
    .trim()
    .max(options.maxFilterLength ?? 100);
  const pageSizes = options.pageSizes ?? [10, 25, 50];
  const defaultPageSize = pageSizes.includes(options.defaultPageSize ?? 25)
    ? (options.defaultPageSize ?? 25)
    : (pageSizes[0] ?? 25);
  const parsedPage = positivePage.safeParse(read(input, "page"));
  const parsedPageSize = positivePageSize.safeParse(read(input, "pageSize"));
  const pageSize =
    parsedPageSize.success && pageSizes.includes(parsedPageSize.data)
      ? parsedPageSize.data
      : defaultPageSize;
  const sort = read(input, "sort");
  const direction = read(input, "direction") === "desc" ? "desc" : "asc";
  const parsedSearch = boundedSearch.safeParse(read(input, "search") ?? "");

  const columnFilters = (options.filterKeys ?? []).flatMap((id) => {
    const value = boundedFilter.safeParse(read(input, `filter.${id}`) ?? "");
    return value.success && value.data ? [{ id, value: value.data }] : [];
  });

  return {
    columnFilters,
    pagination: {
      pageIndex: (parsedPage.success ? parsedPage.data : 1) - 1,
      pageSize,
    },
    search: parsedSearch.success ? parsedSearch.data : "",
    sorting:
      sort && options.sortFields.includes(sort) ? [{ desc: direction === "desc", id: sort }] : [],
  };
}

export function serializeTableUrlState(state: TableUrlState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(state.pagination.pageIndex + 1));
  params.set("pageSize", String(state.pagination.pageSize));
  const sorting = state.sorting[0];
  if (sorting) {
    params.set("sort", sorting.id);
    params.set("direction", sorting.desc ? "desc" : "asc");
  }
  if (state.search) params.set("search", state.search);
  for (const filter of state.columnFilters) {
    if (filter.value) params.set(`filter.${filter.id}`, filter.value);
  }
  params.sort();
  return params;
}

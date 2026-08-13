import { parseTableUrlState } from "@repo/schemas";

export const userRoles = ["CUSTOMER", "VENDOR", "ADMIN"] as const;
export const accountStatuses = ["active", "banned"] as const;

export type UserRole = (typeof userRoles)[number];
export type AccountStatus = (typeof accountStatuses)[number];
export type UserListSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

export type UserListState = Readonly<{
  accountStatus?: AccountStatus;
  page: number;
  pageSize: number;
  role?: UserRole;
  search: string;
}>;

const tableOptions = {
  defaultPageSize: 20,
  filterKeys: ["role", "status"],
  maxFilterLength: 20,
  maxPage: 10_000,
  maxSearchLength: 100,
  pageSizes: [10, 20, 50],
  sortFields: ["createdAt"],
} as const;

export function parseUserListState(searchParams: UserListSearchParams): UserListState {
  const table = parseTableUrlState(searchParams, tableOptions);
  const roleValue = table.columnFilters.find((filter) => filter.id === "role")?.value;
  const statusValue = table.columnFilters.find((filter) => filter.id === "status")?.value;
  return {
    accountStatus: accountStatuses.find((status) => status === statusValue),
    page: table.pagination.pageIndex + 1,
    pageSize: table.pagination.pageSize,
    role: userRoles.find((role) => role === roleValue),
    search: table.search,
  };
}

export function userListHref(state: UserListState, updates: Partial<UserListState> = {}): string {
  const next = { ...state, ...updates };
  const params = new URLSearchParams({
    page: String(next.page),
    pageSize: String(next.pageSize),
    sort: "createdAt",
  });
  if (next.search) params.set("search", next.search);
  if (next.role) params.set("filter.role", next.role);
  if (next.accountStatus) params.set("filter.status", next.accountStatus);
  params.sort();
  return `/users?${params.toString()}`;
}

export function userListQuery(state: UserListState) {
  return {
    isBanned: state.accountStatus ? state.accountStatus === "banned" : undefined,
    limit: state.pageSize,
    page: state.page,
    role: state.role,
    search: state.search || undefined,
  };
}

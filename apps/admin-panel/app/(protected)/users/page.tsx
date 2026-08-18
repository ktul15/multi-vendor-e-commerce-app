import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminUsersView } from "../../admin-users-view";
import { getAdminUsers } from "../../../src/lib/user-data";
import { parseUserListState, userListHref } from "../../../src/lib/user-list-state";
import type { UserListSearchParams } from "../../../src/lib/user-list-state";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<UserListSearchParams> }>) {
  const state = parseUserListState(await searchParams);
  let users;
  try {
    users = await getAdminUsers(state);
  } catch {
    return <AdminUsersView error="Users could not be loaded. Try again." state={state} />;
  }
  if (state.page > users.meta.totalPages) {
    redirect(userListHref(state, { page: users.meta.totalPages }));
  }
  return <AdminUsersView state={state} users={users} />;
}

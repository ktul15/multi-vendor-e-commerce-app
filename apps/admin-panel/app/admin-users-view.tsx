import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from "@repo/ui";
import Link from "next/link";
import type { AdminUser, AdminUsers } from "../src/lib/user-data";
import { accountStatuses, userListHref, userRoles } from "../src/lib/user-list-state";
import type { UserListState } from "../src/lib/user-list-state";
import { formatDashboardDate } from "../src/lib/format";
import { UserStatusAction } from "./user-status-action";

function roleTone(role: AdminUser["role"]) {
  if (role === "ADMIN") return "danger" as const;
  if (role === "VENDOR") return "info" as const;
  return "neutral" as const;
}

function Filters({ state }: Readonly<{ state: UserListState }>) {
  return (
    <form action="/users" className="admin-user-filters" method="get">
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value="createdAt" />
      <Input
        defaultValue={state.search}
        label="Search users"
        maxLength={100}
        name="search"
        placeholder="Name or email"
      />
      <Select defaultValue={state.role ?? ""} label="Role" name="filter.role">
        <option value="">All roles</option>
        {userRoles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </Select>
      <Select defaultValue={state.accountStatus ?? ""} label="Account status" name="filter.status">
        <option value="">All accounts</option>
        {accountStatuses.map((status) => (
          <option key={status} value={status}>
            {status === "active" ? "Active" : "Banned"}
          </option>
        ))}
      </Select>
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
      <div className="admin-user-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/users">
          Clear
        </Link>
      </div>
    </form>
  );
}

export function AdminUsersView({
  error,
  state,
  users,
}: Readonly<{ error?: string; state: UserListState; users?: AdminUsers }>) {
  const hasFilters = Boolean(state.search || state.role || state.accountStatus);
  const first = users && users.meta.total ? (users.meta.page - 1) * users.meta.limit + 1 : 0;
  const last = users ? Math.min(users.meta.page * users.meta.limit, users.meta.total) : 0;

  return (
    <div className="admin-users">
      <header className="admin-users__header">
        <p>Account administration</p>
        <h1>Users</h1>
        <p>Find customer, vendor, and administrator accounts and manage access safely.</p>
      </header>
      <Card>
        <CardContent>
          <Filters state={state} />
        </CardContent>
      </Card>
      {error ? (
        <ErrorState
          action={
            <Link
              className="ui-button ui-button--secondary ui-button--md"
              href={userListHref(state)}
            >
              Try again
            </Link>
          }
          description={error}
          title="Users unavailable"
        />
      ) : users ? (
        <Card>
          <CardContent>
            <p aria-live="polite" className="admin-users__result">
              Showing {first}–{last} of {users.meta.total} users
            </p>
            {users.items.length ? (
              <div
                aria-label="Admin users table"
                className="admin-user-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="admin-user-table">
                  <caption className="ui-visually-hidden">Admin user accounts</caption>
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Role</th>
                      <th scope="col">Verification</th>
                      <th scope="col">Account</th>
                      <th scope="col">Joined</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.items.map((user) => (
                      <tr key={user.id}>
                        <th scope="row">
                          <span className="admin-user-identity">
                            <Link href={`/users/${user.id}`}>{user.name}</Link>
                            <small>{user.email}</small>
                          </span>
                        </th>
                        <td>
                          <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                        </td>
                        <td>
                          <Badge tone={user.isVerified ? "success" : "warning"}>
                            {user.isVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={user.isBanned ? "danger" : "success"}>
                            {user.isBanned ? "Banned" : "Active"}
                          </Badge>
                        </td>
                        <td>
                          <time dateTime={user.createdAt}>
                            {formatDashboardDate(user.createdAt)}
                          </time>
                        </td>
                        <td>
                          <div className="admin-user-row-actions">
                            <Link
                              className="ui-button ui-button--ghost ui-button--sm"
                              href={`/users/${user.id}`}
                            >
                              View
                            </Link>
                            <UserStatusAction user={user} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                action={
                  hasFilters ? (
                    <Link className="ui-button ui-button--secondary ui-button--md" href="/users">
                      Clear filters
                    </Link>
                  ) : undefined
                }
                description={
                  hasFilters
                    ? "Try a different search, role, or account status."
                    : "New marketplace accounts will appear here."
                }
                title={hasFilters ? "No matching users" : "No users yet"}
              />
            )}
            {users.items.length ? (
              <nav aria-label="User pagination" className="admin-user-pagination">
                {state.page <= 1 ? (
                  <span aria-disabled="true">Previous</span>
                ) : (
                  <Link href={userListHref(state, { page: state.page - 1 })}>Previous</Link>
                )}
                <span>
                  Page {users.meta.page} of {users.meta.totalPages}
                </span>
                {state.page >= users.meta.totalPages ? (
                  <span aria-disabled="true">Next</span>
                ) : (
                  <Link href={userListHref(state, { page: state.page + 1 })}>Next</Link>
                )}
              </nav>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

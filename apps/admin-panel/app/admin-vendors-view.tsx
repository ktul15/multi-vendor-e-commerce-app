import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from "@repo/ui";
import Link from "next/link";
import type { AdminVendor, AdminVendors } from "../src/lib/vendor-data";
import { actionsForVendor } from "../src/lib/vendor-lifecycle";
import { vendorListHref, vendorStatuses } from "../src/lib/vendor-list-state";
import type { VendorListState, VendorStatus } from "../src/lib/vendor-list-state";
import { formatDashboardDate } from "../src/lib/format";
import { VendorLifecycleAction } from "./vendor-lifecycle-action";

export function vendorStatusTone(status: VendorStatus) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "danger" as const;
}

function Filters({ state }: Readonly<{ state: VendorListState }>) {
  return (
    <form action="/vendors" className="admin-vendor-filters" method="get">
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value="createdAt" />
      <Input
        defaultValue={state.search}
        label="Search vendors"
        maxLength={100}
        name="search"
        placeholder="Store name or owner email"
      />
      <Select defaultValue={state.status ?? ""} label="Profile status" name="filter.status">
        <option value="">All statuses</option>
        {vendorStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
      <div className="admin-vendor-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/vendors">
          Clear
        </Link>
      </div>
    </form>
  );
}

function RowActions({ vendor }: Readonly<{ vendor: AdminVendor }>) {
  return (
    <div className="admin-vendor-row-actions">
      <Link className="ui-button ui-button--ghost ui-button--sm" href={`/vendors/${vendor.id}`}>
        View
      </Link>
      {actionsForVendor(vendor.status).map((action) => (
        <VendorLifecycleAction action={action} key={action} vendor={vendor} />
      ))}
    </div>
  );
}

export function AdminVendorsView({
  error,
  state,
  vendors,
}: Readonly<{ error?: string; state: VendorListState; vendors?: AdminVendors }>) {
  const hasFilters = Boolean(state.search || state.status);
  const first =
    vendors && vendors.meta.total ? (vendors.meta.page - 1) * vendors.meta.limit + 1 : 0;
  const last = vendors ? Math.min(vendors.meta.page * vendors.meta.limit, vendors.meta.total) : 0;
  return (
    <div className="admin-vendors">
      <header className="admin-vendors__header">
        <p>Marketplace review</p>
        <h1>Vendors</h1>
        <p>Review applications, owner accounts, onboarding, and selling access.</p>
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
              href={vendorListHref(state)}
            >
              Try again
            </Link>
          }
          description={error}
          title="Vendors unavailable"
        />
      ) : vendors ? (
        <Card>
          <CardContent>
            <p aria-live="polite" className="admin-vendors__result">
              Showing {first}–{last} of {vendors.meta.total} vendors
            </p>
            {vendors.items.length ? (
              <div
                aria-label="Admin vendors table"
                className="admin-vendor-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="admin-vendor-table">
                  <caption className="ui-visually-hidden">Admin vendor profiles</caption>
                  <thead>
                    <tr>
                      <th scope="col">Store</th>
                      <th scope="col">Owner</th>
                      <th scope="col">Status</th>
                      <th scope="col">Onboarding</th>
                      <th scope="col">Commission</th>
                      <th scope="col">Joined</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.items.map((vendor) => (
                      <tr key={vendor.id}>
                        <th scope="row">
                          <Link href={`/vendors/${vendor.id}`}>{vendor.storeName}</Link>
                        </th>
                        <td>
                          <span className="admin-vendor-owner">
                            <strong>{vendor.user.name}</strong>
                            <small>{vendor.user.email}</small>
                            {vendor.user.isBanned ? (
                              <Badge tone="danger">Owner banned</Badge>
                            ) : null}
                          </span>
                        </td>
                        <td>
                          <Badge tone={vendorStatusTone(vendor.status)}>{vendor.status}</Badge>
                        </td>
                        <td>{vendor.stripeOnboardingStatus.replaceAll("_", " ")}</td>
                        <td>
                          {vendor.commissionRate === null
                            ? "Platform default"
                            : `${vendor.commissionRate}%`}
                        </td>
                        <td>
                          <time dateTime={vendor.createdAt}>
                            {formatDashboardDate(vendor.createdAt)}
                          </time>
                        </td>
                        <td>
                          <RowActions vendor={vendor} />
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
                    <Link className="ui-button ui-button--secondary ui-button--md" href="/vendors">
                      Clear filters
                    </Link>
                  ) : undefined
                }
                description={
                  hasFilters
                    ? "Try a different search or profile status."
                    : "New vendor applications will appear here."
                }
                title={hasFilters ? "No matching vendors" : "No vendors yet"}
              />
            )}
            {vendors.items.length ? (
              <nav aria-label="Vendor pagination" className="admin-vendor-pagination">
                {state.page <= 1 ? (
                  <span aria-disabled="true">Previous</span>
                ) : (
                  <Link href={vendorListHref(state, { page: state.page - 1 })}>Previous</Link>
                )}
                <span>
                  Page {vendors.meta.page} of {vendors.meta.totalPages}
                </span>
                {state.page >= vendors.meta.totalPages ? (
                  <span aria-disabled="true">Next</span>
                ) : (
                  <Link href={vendorListHref(state, { page: state.page + 1 })}>Next</Link>
                )}
              </nav>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Select } from "@repo/ui";
import Link from "next/link";
import type { AdminOrder, AdminOrders } from "../src/lib/order-data";
import { orderListHref, orderStatuses } from "../src/lib/order-list-state";
import type { OrderListState } from "../src/lib/order-list-state";
import { formatDashboardDate, formatInr } from "../src/lib/format";
import { OrderRefreshButton } from "./order-refresh-button";

export function orderStatus(order: AdminOrder): string {
  if (order.fulfillmentStatus.kind === "MIXED") return "MIXED";
  return order.fulfillmentStatus.status ?? order.fulfillmentStatus.kind;
}

export function orderStatusTone(status: string) {
  if (status === "DELIVERED" || status === "SUCCEEDED") return "success" as const;
  if (status === "CANCELLED" || status === "REFUNDED" || status === "FAILED") {
    return "danger" as const;
  }
  if (status === "PENDING" || status === "NONE") return "warning" as const;
  return "info" as const;
}

function Filters({ state }: Readonly<{ state: OrderListState }>) {
  return (
    <form action="/orders" className="admin-order-filters" method="get">
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value="createdAt" />
      <Input
        defaultValue={state.search}
        label="Search orders"
        maxLength={100}
        name="search"
        placeholder="Order number, customer, or email"
      />
      <Select defaultValue={state.status ?? ""} label="Fulfillment status" name="filter.status">
        <option value="">All statuses</option>
        {orderStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Input
        defaultValue={state.userId ?? ""}
        label="Customer ID"
        name="filter.userId"
        placeholder="UUID"
      />
      <Input
        defaultValue={state.vendorId ?? ""}
        label="Vendor owner ID"
        name="filter.vendorId"
        placeholder="UUID"
      />
      <Input
        defaultValue={state.startDate ?? ""}
        label="From date"
        name="filter.startDate"
        type="date"
      />
      <Input defaultValue={state.endDate ?? ""} label="To date" name="filter.endDate" type="date" />
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
      <div className="admin-order-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/orders">
          Clear
        </Link>
      </div>
    </form>
  );
}

export function AdminOrdersView({
  error,
  orders,
  state,
}: Readonly<{ error?: string; orders?: AdminOrders; state: OrderListState }>) {
  const hasFilters = Boolean(
    state.search ||
    state.status ||
    state.userId ||
    state.vendorId ||
    state.startDate ||
    state.endDate,
  );
  const first = orders && orders.meta.total ? (orders.meta.page - 1) * orders.meta.limit + 1 : 0;
  const last = orders ? Math.min(orders.meta.page * orders.meta.limit, orders.meta.total) : 0;
  return (
    <div className="admin-order-list">
      <header className="admin-order-list__header">
        <div>
          <p>Marketplace operations</p>
          <h1>Orders</h1>
          <p>Review customer orders and each vendor&apos;s independent fulfillment state.</p>
        </div>
        <OrderRefreshButton />
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
              href={orderListHref(state)}
            >
              Try again
            </Link>
          }
          description={error}
          title="Orders unavailable"
        />
      ) : orders ? (
        <Card>
          <CardContent>
            <p aria-live="polite" className="admin-order-list__result">
              Showing {first}–{last} of {orders.meta.total} orders
            </p>
            {orders.items.length ? (
              <div
                aria-label="Admin orders table"
                className="admin-order-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="admin-order-table">
                  <caption className="ui-visually-hidden">Marketplace customer orders</caption>
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Stores</th>
                      <th scope="col">Fulfillment</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Total</th>
                      <th scope="col">Created</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.items.map((order) => {
                      const status = orderStatus(order);
                      const stores = [
                        ...new Set(
                          order.vendorOrders.map(
                            (entry) => entry.vendor.vendorProfile?.storeName ?? "Store unavailable",
                          ),
                        ),
                      ];
                      return (
                        <tr key={order.id}>
                          <th scope="row">
                            <Link href={`/orders/${order.id}`}>{order.orderNumber}</Link>
                          </th>
                          <td>
                            <span className="admin-order-customer">
                              <strong>{order.user.name}</strong>
                              <small>{order.user.email}</small>
                            </span>
                          </td>
                          <td>{stores.length ? stores.join(", ") : "Unassigned"}</td>
                          <td>
                            <Badge tone={orderStatusTone(status)}>{status}</Badge>
                          </td>
                          <td>
                            {order.payment ? (
                              <Badge tone={orderStatusTone(order.payment.status)}>
                                {order.payment.status}
                              </Badge>
                            ) : (
                              "Not recorded"
                            )}
                          </td>
                          <td>{formatInr(order.total)}</td>
                          <td>
                            <time dateTime={order.createdAt}>
                              {formatDashboardDate(order.createdAt)}
                            </time>
                          </td>
                          <td>
                            <Link
                              className="ui-button ui-button--ghost ui-button--sm"
                              href={`/orders/${order.id}`}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                action={
                  hasFilters ? (
                    <Link className="ui-button ui-button--secondary ui-button--md" href="/orders">
                      Clear filters
                    </Link>
                  ) : undefined
                }
                description={
                  hasFilters
                    ? "Try different search or filter criteria."
                    : "New marketplace orders will appear here."
                }
                title={hasFilters ? "No matching orders" : "No orders yet"}
              />
            )}
            {orders.items.length ? (
              <nav aria-label="Order pagination" className="admin-order-pagination">
                {state.page <= 1 ? (
                  <span aria-disabled="true">Previous</span>
                ) : (
                  <Link href={orderListHref(state, { page: state.page - 1 })}>Previous</Link>
                )}
                <span>
                  Page {orders.meta.page} of {orders.meta.totalPages}
                </span>
                {state.page >= orders.meta.totalPages ? (
                  <span aria-disabled="true">Next</span>
                ) : (
                  <Link href={orderListHref(state, { page: state.page + 1 })}>Next</Link>
                )}
              </nav>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

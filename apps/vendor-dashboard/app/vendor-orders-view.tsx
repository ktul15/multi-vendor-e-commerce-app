import { Badge, Card, CardContent, EmptyState, ErrorState, Input, Select, Button } from "@repo/ui";
import Link from "next/link";
import type { VendorOrders } from "../src/lib/order-data";
import { orderListHref, orderStatuses } from "../src/lib/order-list-state";
import type { OrderListState, OrderStatus } from "../src/lib/order-list-state";
import { OrderStatusAction } from "./order-status-action";

const money = new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

function statusTone(status: OrderStatus) {
  if (status === "DELIVERED") return "success" as const;
  if (status === "CANCELLED" || status === "REFUNDED") return "danger" as const;
  if (status === "SHIPPED" || status === "PROCESSING") return "warning" as const;
  return "neutral" as const;
}

function Filters({ state }: Readonly<{ state: OrderListState }>) {
  return (
    <form action="/orders" className="vendor-order-filters" method="get">
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value="createdAt" />
      <Input
        defaultValue={state.search}
        label="Search orders"
        maxLength={100}
        name="search"
        placeholder="Order, customer, email, or tracking"
      />
      <Select defaultValue={state.status ?? ""} label="Order status" name="filter.status">
        <option value="">All statuses</option>
        {orderStatuses.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </Select>
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
      </Select>
      <div className="vendor-order-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/orders">
          Clear
        </Link>
      </div>
    </form>
  );
}

export function VendorOrdersView({
  error,
  orders,
  state,
}: Readonly<{ error?: string; orders?: VendorOrders; state: OrderListState }>) {
  const hasFilters = Boolean(state.search || state.status);
  const first = orders && orders.meta.total ? (orders.meta.page - 1) * orders.meta.limit + 1 : 0;
  const last = orders ? Math.min(orders.meta.page * orders.meta.limit, orders.meta.total) : 0;
  return (
    <div className="vendor-orders">
      <header className="vendor-orders__header">
        <p>Fulfilment</p>
        <h1>Orders</h1>
        <p>Review customer orders and progress each shipment safely.</p>
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
            <p aria-live="polite" className="vendor-orders__result">
              Showing {first}–{last} of {orders.meta.total} orders
            </p>
            {orders.items.length ? (
              <div
                aria-label="Vendor orders table"
                className="vendor-order-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="vendor-order-table">
                  <caption className="ui-visually-hidden">Vendor orders</caption>
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Placed</th>
                      <th scope="col">Items</th>
                      <th scope="col">Subtotal</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.items.map((order) => (
                      <tr key={order.id}>
                        <th scope="row">
                          <Link href={`/orders/${order.id}`}>{order.order.orderNumber}</Link>
                        </th>
                        <td>
                          <span className="vendor-order-customer">
                            <strong>{order.order.user.name}</strong>
                            <small>{order.order.user.email}</small>
                          </span>
                        </td>
                        <td>
                          <time dateTime={order.createdAt}>
                            {date.format(new Date(order.createdAt))}
                          </time>
                        </td>
                        <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                        <td>{money.format(Number(order.subtotal))}</td>
                        <td>
                          <Badge tone={statusTone(order.status)}>
                            {order.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td>
                          <div className="vendor-order-row-actions">
                            <Link
                              className="ui-button ui-button--ghost ui-button--sm"
                              href={`/orders/${order.id}`}
                            >
                              View
                            </Link>
                            <OrderStatusAction order={order} />
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
                    <Link className="ui-button ui-button--secondary ui-button--md" href="/orders">
                      Clear filters
                    </Link>
                  ) : undefined
                }
                description={
                  hasFilters
                    ? "Try a different search or status."
                    : "New customer orders will appear here."
                }
                title={hasFilters ? "No matching orders" : "No orders yet"}
              />
            )}
            {orders.items.length ? (
              <nav aria-label="Order pagination" className="vendor-order-pagination">
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

import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminOrderDetail } from "../src/lib/order-data";
import { formatDashboardDate, formatInr } from "../src/lib/format";
import { orderStatusTone } from "./admin-orders-view";
import { OrderRefreshButton } from "./order-refresh-button";

function Field({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="admin-order-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function readableValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "";
}

function fulfillmentLabel(order: AdminOrderDetail): string {
  if (order.fulfillmentStatus.kind === "MIXED") return "MIXED";
  return order.fulfillmentStatus.status ?? order.fulfillmentStatus.kind;
}

export function AdminOrderDetailView({
  error,
  order,
}: Readonly<{ error?: string; order?: AdminOrderDetail }>) {
  if (error || !order) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/orders">
            Back to orders
          </Link>
        }
        description={error ?? "Order details could not be loaded."}
        title="Order unavailable"
      />
    );
  }
  const fulfillment = fulfillmentLabel(order);
  const shippingEntries = Object.entries(order.shippingAddress)
    .map(([key, value]) => [key, readableValue(value)] as const)
    .filter((entry) => entry[1]);
  return (
    <div className="admin-order-detail">
      <header className="admin-order-detail__header">
        <div>
          <Link href="/orders">← Orders</Link>
          <p>Order detail</p>
          <h1>{order.orderNumber}</h1>
          <div className="admin-order-detail__badges">
            <Badge tone={orderStatusTone(fulfillment)}>Fulfillment: {fulfillment}</Badge>
            <Badge tone={order.payment ? orderStatusTone(order.payment.status) : "warning"}>
              Payment: {order.payment?.status ?? "NOT_RECORDED"}
            </Badge>
          </div>
        </div>
        <OrderRefreshButton />
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Customer and order</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="admin-order-detail__grid">
            <Field label="Order ID" value={<code>{order.id}</code>} />
            <Field
              label="Customer"
              value={<Link href={`/users/${order.user.id}`}>{order.user.name}</Link>}
            />
            <Field label="Customer email" value={order.user.email} />
            <Field label="Customer ID" value={<code>{order.user.id}</code>} />
            <Field
              label="Created"
              value={<time dateTime={order.createdAt}>{formatDashboardDate(order.createdAt)}</time>}
            />
            <Field
              label="Updated"
              value={<time dateTime={order.updatedAt}>{formatDashboardDate(order.updatedAt)}</time>}
            />
            <Field label="Notes" value={order.notes || "None"} />
            <Field label="Cancellation reason" value={order.cancellationReason || "None"} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Totals and payment</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="admin-order-detail__grid">
            <Field label="Subtotal" value={formatInr(order.subtotal)} />
            <Field label="Discount" value={formatInr(order.discount)} />
            <Field label="Tax" value={formatInr(order.tax)} />
            <Field label="Total" value={<strong>{formatInr(order.total)}</strong>} />
            <Field label="Payment method" value={order.payment?.method ?? "Not recorded"} />
            <Field label="Payment status" value={order.payment?.status ?? "NOT_RECORDED"} />
            <Field
              label="Paid at"
              value={
                order.payment?.paidAt ? (
                  <time dateTime={order.payment.paidAt}>
                    {formatDashboardDate(order.payment.paidAt)}
                  </time>
                ) : (
                  "Not paid"
                )
              }
            />
            <Field
              label="Promo code"
              value={
                order.promoCode
                  ? `${order.promoCode.code} (${order.promoCode.discountType}: ${order.promoCode.discountValue})`
                  : "None"
              }
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="admin-order-detail__grid">
            {Object.entries(order.address).map(([key, value]) => (
              <Field key={key} label={key.replaceAll(/([A-Z])/g, " $1")} value={value} />
            ))}
          </dl>
          {shippingEntries.length ? (
            <details className="admin-order-detail__snapshot">
              <summary>Order-time shipping snapshot</summary>
              <dl className="admin-order-detail__grid">
                {shippingEntries.map(([key, value]) => (
                  <Field key={key} label={key.replaceAll(/([A-Z])/g, " $1")} value={value} />
                ))}
              </dl>
            </details>
          ) : null}
        </CardContent>
      </Card>
      <section aria-label="Vendor fulfillment" className="admin-order-detail__vendors">
        <h2>Vendor fulfillment</h2>
        <p>
          {order.fulfillmentStatus.kind === "MIXED"
            ? `This order has mixed states: ${order.fulfillmentStatus.statuses.join(", ")}.`
            : `All vendor sub-orders are ${fulfillment}.`}
        </p>
        {order.vendorOrders.length ? (
          order.vendorOrders.map((vendorOrder) => {
            const store = vendorOrder.vendor.vendorProfile;
            return (
              <Card key={vendorOrder.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{store?.storeName ?? "Store unavailable"}</CardTitle>
                    <p className="admin-order-detail__vendor-id">Sub-order {vendorOrder.id}</p>
                  </div>
                  <Badge tone={orderStatusTone(vendorOrder.status)}>{vendorOrder.status}</Badge>
                </CardHeader>
                <CardContent>
                  <dl className="admin-order-detail__grid">
                    <Field
                      label="Vendor"
                      value={
                        store ? (
                          <Link href={`/vendors/${store.id}`}>{store.storeName}</Link>
                        ) : (
                          "Unavailable"
                        )
                      }
                    />
                    <Field label="Vendor owner ID" value={<code>{vendorOrder.vendorId}</code>} />
                    <Field label="Subtotal" value={formatInr(vendorOrder.subtotal)} />
                    <Field
                      label="Tracking carrier"
                      value={vendorOrder.trackingCarrier || "Not assigned"}
                    />
                    <Field
                      label="Tracking number"
                      value={vendorOrder.trackingNumber || "Not assigned"}
                    />
                  </dl>
                  {vendorOrder.items.length ? (
                    <div
                      aria-label={`${store?.storeName ?? "Vendor"} order items`}
                      className="admin-order-table-wrap"
                      role="region"
                      tabIndex={0}
                    >
                      <table className="admin-order-table admin-order-items-table">
                        <caption className="ui-visually-hidden">
                          Items supplied by {store?.storeName ?? "vendor"}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Product</th>
                            <th scope="col">SKU</th>
                            <th scope="col">Options</th>
                            <th scope="col">Quantity</th>
                            <th scope="col">Unit price</th>
                            <th scope="col">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorOrder.items.map((item) => (
                            <tr key={item.id}>
                              <th scope="row">{item.variant.product.name}</th>
                              <td>{item.variant.sku}</td>
                              <td>
                                {[item.variant.size, item.variant.color]
                                  .filter(Boolean)
                                  .join(" / ") || "—"}
                              </td>
                              <td>{item.quantity}</td>
                              <td>{formatInr(item.unitPrice)}</td>
                              <td>{formatInr(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      description="No items were returned for this vendor sub-order."
                      title="No order items"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState
            description="No vendor sub-orders are attached to this order."
            title="No vendor fulfillment"
          />
        )}
      </section>
    </div>
  );
}

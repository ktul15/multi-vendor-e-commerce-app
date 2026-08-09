import { Badge, Card, CardContent, CardHeader, CardTitle, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { VendorOrder } from "../src/lib/order-data";
import { OrderStatusAction } from "./order-status-action";

const money = new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

function shippingLines(address: VendorOrder["order"]["shippingAddress"]): string[] {
  const fields = ["fullName", "street", "city", "state", "zipCode", "country", "phone"];
  return fields.flatMap((field) => {
    const value = address[field];
    return typeof value === "string" && value.trim() ? [value] : [];
  });
}

export function VendorOrderDetailView({
  error,
  order,
}: Readonly<{ error?: string; order?: VendorOrder }>) {
  if (error || !order) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/orders">
            Back to orders
          </Link>
        }
        description={error ?? "This order is unavailable."}
        title="Order unavailable"
      />
    );
  }
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const address = shippingLines(order.order.shippingAddress);
  return (
    <div className="vendor-order-detail">
      <header className="vendor-order-detail__header">
        <div>
          <Link href="/orders">← Orders</Link>
          <h1>{order.order.orderNumber}</h1>
          <p>
            Placed <time dateTime={order.createdAt}>{date.format(new Date(order.createdAt))}</time>
          </p>
        </div>
        <div className="vendor-order-detail__status">
          <Badge>{order.status.replaceAll("_", " ")}</Badge>
          <OrderStatusAction order={order} />
        </div>
      </header>
      <div className="vendor-order-detail__grid">
        <Card className="vendor-order-detail__items">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="vendor-order-items">
              {order.items.map((item) => (
                <article className="vendor-order-item" key={item.id}>
                  <div aria-hidden="true" className="vendor-order-item__image">
                    {item.variant.product.name.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{item.variant.product.name}</strong>
                    <small>
                      SKU {item.variant.sku}
                      {item.variant.size ? ` · ${item.variant.size}` : ""}
                      {item.variant.color ? ` · ${item.variant.color}` : ""}
                    </small>
                    <small>
                      {item.quantity} × {money.format(Number(item.unitPrice))}
                    </small>
                  </div>
                  <strong>{money.format(Number(item.totalPrice))}</strong>
                </article>
              ))}
            </div>
            <dl className="vendor-order-totals">
              <div>
                <dt>Item quantity</dt>
                <dd>{itemCount}</dd>
              </div>
              <div>
                <dt>Shipment subtotal</dt>
                <dd>{money.format(Number(order.subtotal))}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <div className="vendor-order-detail__side">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <strong>{order.order.user.name}</strong>
                <br />
                <a href={`mailto:${order.order.user.email}`}>{order.order.user.email}</a>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Shipment</CardTitle>
            </CardHeader>
            <CardContent>
              {address.length ? (
                <address>
                  {address.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              ) : (
                <p>Shipping address unavailable.</p>
              )}
              {order.trackingNumber ? (
                <p>
                  <strong>Tracking</strong>
                  <br />
                  {order.trackingCarrier ? `${order.trackingCarrier} · ` : ""}
                  {order.trackingNumber}
                </p>
              ) : (
                <p>Tracking not added yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order.payment ? (
                <dl className="vendor-order-payment">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <Badge>{order.order.payment.status}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{order.order.payment.method.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>
                      {order.order.payment.paidAt
                        ? date.format(new Date(order.order.payment.paidAt))
                        : "Not paid"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p>Payment details unavailable.</p>
              )}
            </CardContent>
          </Card>
          {order.order.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer note</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{order.order.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

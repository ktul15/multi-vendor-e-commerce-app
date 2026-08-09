import { redirect } from "next/navigation";
import { VendorOrdersView } from "../../vendor-orders-view";
import { getVendorOrders } from "../../../src/lib/order-data";
import { orderListHref, parseOrderListState } from "../../../src/lib/order-list-state";
import type { OrderListSearchParams } from "../../../src/lib/order-list-state";

export default async function OrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<OrderListSearchParams> }>) {
  const state = parseOrderListState(await searchParams);
  let orders;
  try {
    orders = await getVendorOrders(state);
  } catch {
    return (
      <VendorOrdersView
        error="Orders could not be loaded. Check your connection and try again."
        state={state}
      />
    );
  }
  if (state.page > orders.meta.totalPages) {
    redirect(orderListHref(state, { page: orders.meta.totalPages }));
  }
  return <VendorOrdersView orders={orders} state={state} />;
}

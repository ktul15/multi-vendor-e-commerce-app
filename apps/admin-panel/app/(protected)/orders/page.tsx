import { redirect } from "next/navigation";
import { AdminOrdersView } from "../../admin-orders-view";
import { getAdminOrders } from "../../../src/lib/order-data";
import { orderListHref, parseOrderListState } from "../../../src/lib/order-list-state";
import type { OrderListSearchParams } from "../../../src/lib/order-list-state";

export default async function OrdersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<OrderListSearchParams> }>) {
  const state = parseOrderListState(await searchParams);
  let orders;
  try {
    orders = await getAdminOrders(state);
  } catch {
    return <AdminOrdersView error="Orders could not be loaded. Try again." state={state} />;
  }
  if (state.page > orders.meta.totalPages) {
    redirect(orderListHref(state, { page: orders.meta.totalPages }));
  }
  return <AdminOrdersView orders={orders} state={state} />;
}

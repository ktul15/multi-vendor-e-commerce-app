import { notFound } from "next/navigation";
import { AdminOrderDetailView } from "../../../admin-order-detail-view";
import { getAdminOrder, OrderDataError } from "../../../../src/lib/order-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function OrderDetailPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ id: string }>> }>) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  let order;
  try {
    order = await getAdminOrder(id);
  } catch (error) {
    if (error instanceof OrderDataError && error.status === 404) notFound();
    return <AdminOrderDetailView error="Order details could not be loaded. Try again." />;
  }
  return <AdminOrderDetailView order={order} />;
}

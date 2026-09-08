import { notFound } from "next/navigation";
import { VendorOrderDetailView } from "../../../vendor-order-detail";
import { getVendorOrder } from "../../../../src/lib/order-data";

export default async function OrderDetailPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ id: string }>> }>) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  let order;
  try {
    order = await getVendorOrder(id);
  } catch {
    return <VendorOrderDetailView error="This order could not be loaded." />;
  }
  return <VendorOrderDetailView order={order} />;
}

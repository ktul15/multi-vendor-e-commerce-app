import { notFound } from "next/navigation";
import { AdminProductDetailView } from "../../../admin-product-detail-view";
import { getAdminProduct, ProductDataError } from "../../../../src/lib/product-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ProductDetailPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ id: string }>> }>) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  let product;
  try {
    product = await getAdminProduct(id);
  } catch (error) {
    if (error instanceof ProductDataError && error.status === 404) notFound();
    return <AdminProductDetailView error="Product details could not be loaded. Try again." />;
  }
  return <AdminProductDetailView product={product} />;
}

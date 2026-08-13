import { redirect } from "next/navigation";
import { AdminProductsView } from "../../admin-products-view";
import { getAdminProducts } from "../../../src/lib/product-data";
import { parseProductListState, productListHref } from "../../../src/lib/product-list-state";
import type { ProductListSearchParams } from "../../../src/lib/product-list-state";

export default async function ProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<ProductListSearchParams> }>) {
  const state = parseProductListState(await searchParams);
  let products;
  try {
    products = await getAdminProducts(state);
  } catch {
    return <AdminProductsView error="Products could not be loaded. Try again." state={state} />;
  }
  if (state.page > products.meta.totalPages) {
    redirect(productListHref(state, { page: products.meta.totalPages }));
  }
  return <AdminProductsView products={products} state={state} />;
}

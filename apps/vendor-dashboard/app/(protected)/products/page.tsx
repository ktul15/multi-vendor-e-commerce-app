import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductInventory } from "../../product-inventory";
import { getVendorInventory } from "../../../src/lib/product-data";
import { parseProductListState, productListHref } from "../../../src/lib/product-list-state";
import type { ProductListSearchParams } from "../../../src/lib/product-list-state";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<ProductListSearchParams> }>) {
  const state = parseProductListState(await searchParams);
  let inventory;
  try {
    inventory = await getVendorInventory(state);
  } catch {
    return (
      <ProductInventory
        error="Products could not be loaded. Check your connection and try again."
        state={state}
      />
    );
  }
  if (state.page > inventory.meta.totalPages) {
    redirect(productListHref(state, { page: inventory.meta.totalPages }));
  }
  return <ProductInventory inventory={inventory} state={state} />;
}

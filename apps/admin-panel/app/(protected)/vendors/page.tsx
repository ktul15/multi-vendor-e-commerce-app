import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminVendorsView } from "../../admin-vendors-view";
import { getAdminVendors } from "../../../src/lib/vendor-data";
import { parseVendorListState, vendorListHref } from "../../../src/lib/vendor-list-state";
import type { VendorListSearchParams } from "../../../src/lib/vendor-list-state";

export const metadata: Metadata = { title: "Vendors" };

export default async function VendorsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<VendorListSearchParams> }>) {
  const state = parseVendorListState(await searchParams);
  let vendors;
  try {
    vendors = await getAdminVendors(state);
  } catch {
    return <AdminVendorsView error="Vendors could not be loaded. Try again." state={state} />;
  }
  if (state.page > vendors.meta.totalPages) {
    redirect(vendorListHref(state, { page: vendors.meta.totalPages }));
  }
  return <AdminVendorsView state={state} vendors={vendors} />;
}

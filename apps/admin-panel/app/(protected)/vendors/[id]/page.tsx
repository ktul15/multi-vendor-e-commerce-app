import { notFound } from "next/navigation";
import { AdminVendorDetailView } from "../../../admin-vendor-detail-view";
import { getDefaultCommission } from "../../../../src/lib/commission-data";
import { getAdminVendor, VendorDataError } from "../../../../src/lib/vendor-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function VendorDetailPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ id: string }>> }>) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  let vendor;
  try {
    vendor = await getAdminVendor(id);
  } catch (error) {
    if (error instanceof VendorDataError && error.status === 404) notFound();
    return <AdminVendorDetailView error="Vendor details could not be loaded. Try again." />;
  }
  let commission;
  try {
    commission = await getDefaultCommission();
  } catch {
    return (
      <AdminVendorDetailView
        commissionError="Platform default could not be loaded. Commission changes are temporarily unavailable."
        vendor={vendor}
      />
    );
  }
  return <AdminVendorDetailView defaultCommission={commission} vendor={vendor} />;
}

import { AdminCommissionView } from "../../admin-commission-view";
import { getDefaultCommission } from "../../../src/lib/commission-data";

export default async function FinancePage() {
  let commission;
  try {
    commission = await getDefaultCommission();
  } catch {
    return <AdminCommissionView error="Commission settings could not be loaded. Try again." />;
  }
  return <AdminCommissionView commission={commission} />;
}

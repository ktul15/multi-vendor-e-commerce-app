import type { Metadata } from "next";
import { AdminFinanceView } from "../../admin-finance-view";
import { getAdminFinanceData } from "../../../src/lib/finance-data";
import { parseFinanceState } from "../../../src/lib/finance-state";
import type { FinanceSearchParams } from "../../../src/lib/finance-state";

export const metadata: Metadata = { title: "Revenue and payouts" };

export default async function FinancePage({
  searchParams,
}: Readonly<{ searchParams: Promise<FinanceSearchParams> }>) {
  const state = parseFinanceState(await searchParams);
  if (state.validationError) return <AdminFinanceView state={state} />;
  let data;
  try {
    data = await getAdminFinanceData(state);
  } catch {
    return (
      <AdminFinanceView error="Finance services could not be loaded. Try again." state={state} />
    );
  }
  return <AdminFinanceView data={data} state={state} />;
}

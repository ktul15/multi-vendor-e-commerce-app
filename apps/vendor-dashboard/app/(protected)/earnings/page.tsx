import { EarningsOverview } from "../../earnings-overview";
import { getVendorEarningsData } from "../../../src/lib/earnings-data";
import { parseDashboardRange } from "../../../src/lib/dashboard-range";
import { redirect } from "next/navigation";

type SearchParams = Promise<Readonly<Record<string, string | readonly string[] | undefined>>>;

export default async function VendorEarningsPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const range = parseDashboardRange(params);
  const parsePage = (value: string | readonly string[] | undefined): number => {
    const parsed = Number.parseInt(typeof value === "string" ? value : (value?.[0] ?? ""), 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
  };
  const pages = {
    earningsPage: parsePage(params.earningsPage),
    payoutPage: parsePage(params.payoutPage),
  };
  const data = await getVendorEarningsData(range, pages);
  const correctedPages = {
    earningsPage:
      data.earnings.status === "success"
        ? Math.min(pages.earningsPage, Math.max(1, data.earnings.data.pagination.totalPages))
        : pages.earningsPage,
    payoutPage:
      data.payouts.status === "success"
        ? Math.min(pages.payoutPage, Math.max(1, data.payouts.data.pagination.totalPages))
        : pages.payoutPage,
  };
  if (
    correctedPages.earningsPage !== pages.earningsPage ||
    correctedPages.payoutPage !== pages.payoutPage
  ) {
    redirect(
      `/earnings?${new URLSearchParams({
        earningsPage: String(correctedPages.earningsPage),
        payoutPage: String(correctedPages.payoutPage),
        period: range.period,
        range: range.range,
      }).toString()}`,
    );
  }
  return <EarningsOverview data={data} pages={pages} range={range} />;
}

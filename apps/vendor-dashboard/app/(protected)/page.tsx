import type { Metadata } from "next";
import { DashboardOverview } from "../dashboard-overview";
import { getVendorDashboardData } from "../../src/lib/dashboard-data";
import { parseDashboardRange } from "../../src/lib/dashboard-range";

type SearchParams = Promise<Readonly<Record<string, string | readonly string[] | undefined>>>;

export const metadata: Metadata = { title: "Dashboard" };

export default async function VendorDashboardPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const range = parseDashboardRange(await searchParams);
  const data = await getVendorDashboardData(range);
  return <DashboardOverview data={data} range={range} />;
}

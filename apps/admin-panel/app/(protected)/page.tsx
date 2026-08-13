import { DashboardOverview } from "../dashboard-overview";
import { getAdminDashboardData } from "../../src/lib/dashboard-data";
import { parseDashboardRange } from "../../src/lib/dashboard-range";

type SearchParams = Promise<Readonly<Record<string, string | readonly string[] | undefined>>>;

export default async function AdminPanelPage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const range = parseDashboardRange(await searchParams);
  const data = await getAdminDashboardData(range);
  return <DashboardOverview data={data} range={range} />;
}

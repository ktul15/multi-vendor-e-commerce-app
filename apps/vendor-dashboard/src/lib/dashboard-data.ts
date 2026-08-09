import "server-only";

import { createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { DashboardRangeState } from "./dashboard-range";

export type VendorSummary = components["schemas"]["VendorAnalyticsSummarySuccess"]["data"];
export type VendorSales = components["schemas"]["VendorSalesSuccess"]["data"];
export type VendorOrders = components["schemas"]["VendorOrdersSuccess"]["data"];

export type DashboardResult<T> =
  | Readonly<{ data: T; status: "success" }>
  | Readonly<{ message: string; status: "error" }>;

export type VendorDashboardData = Readonly<{
  orders: DashboardResult<VendorOrders>;
  sales: DashboardResult<VendorSales>;
  summary: DashboardResult<VendorSummary>;
}>;

function result<T>(settled: PromiseSettledResult<T>, message: string): DashboardResult<T> {
  return settled.status === "fulfilled"
    ? { data: settled.value, status: "success" }
    : { message, status: "error" };
}

export async function getVendorDashboardData(
  range: DashboardRangeState,
): Promise<VendorDashboardData> {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new Error("Vendor dashboard configuration is unavailable");

  const client = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
  const query = { endDate: range.endDate, startDate: range.startDate };
  const summaryRequest: Promise<VendorSummary> = client
    .GET("/analytics/vendor/summary", { params: { query } })
    .then(({ data }) => {
      if (!data) throw new Error("Summary response is empty");
      return data.data;
    });
  const salesRequest: Promise<VendorSales> = client
    .GET("/analytics/vendor/sales", {
      params: { query: { ...query, period: range.period } },
    })
    .then(({ data }) => {
      if (!data) throw new Error("Sales response is empty");
      return data.data as VendorSales;
    });
  const ordersRequest: Promise<VendorOrders> = client
    .GET("/orders/vendor", { params: { query: { limit: 5, page: 1 } } })
    .then(({ data }) => {
      if (!data) throw new Error("Orders response is empty");
      return data.data as VendorOrders;
    });
  const [summary, sales, orders] = await Promise.allSettled([
    summaryRequest,
    salesRequest,
    ordersRequest,
  ]);

  return {
    orders: result(orders, "Recent orders could not be loaded."),
    sales: result(sales, "Sales history could not be loaded."),
    summary: result(summary, "Summary metrics could not be loaded."),
  };
}

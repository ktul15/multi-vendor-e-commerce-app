import "server-only";

import { createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { DashboardRangeState } from "./dashboard-range";

export type AdminSummary = components["schemas"]["AdminDashboardSuccess"]["data"];
type AdminRevenueReport = components["schemas"]["AdminRevenueSuccess"]["data"];
export type AdminRevenue = Readonly<{
  dateRange: AdminRevenueReport["dateRange"];
  period: AdminRevenueReport["period"];
  series: AdminRevenueReport["series"];
}>;
export type AdminOrders = components["schemas"]["AdminOrdersSuccess"]["data"];

export type DashboardResult<T> =
  | Readonly<{ data: T; status: "success" }>
  | Readonly<{ message: string; status: "error" }>;

export type AdminDashboardData = Readonly<{
  orders: DashboardResult<AdminOrders>;
  revenue: DashboardResult<AdminRevenue>;
  summary: DashboardResult<AdminSummary>;
}>;

function result<T>(settled: PromiseSettledResult<T>, message: string): DashboardResult<T> {
  return settled.status === "fulfilled"
    ? { data: settled.value, status: "success" }
    : { message, status: "error" };
}

export async function getAdminDashboardData(
  range: DashboardRangeState,
): Promise<AdminDashboardData> {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new Error("Admin dashboard configuration is unavailable");

  const client = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
  const summaryRequest: Promise<AdminSummary> = client.GET("/admin/dashboard").then(({ data }) => {
    if (!data) throw new Error("Dashboard response is empty");
    return data.data;
  });
  const revenueRequest: Promise<AdminRevenue> = client
    .GET("/admin/revenue", {
      params: {
        query: { endDate: range.endDate, period: range.period, startDate: range.startDate },
      },
    })
    .then(({ data }) => {
      if (!data) throw new Error("Revenue response is empty");
      return data.data as unknown as AdminRevenue;
    });
  const ordersRequest: Promise<AdminOrders> = client
    .GET("/admin/orders", { params: { query: { limit: 5, page: 1 } } })
    .then(({ data }) => {
      if (!data) throw new Error("Orders response is empty");
      return data.data as AdminOrders;
    });
  const [summary, revenue, orders] = await Promise.allSettled([
    summaryRequest,
    revenueRequest,
    ordersRequest,
  ]);

  return {
    orders: result(orders, "Recent platform orders could not be loaded."),
    revenue: result(revenue, "Gross merchandise value could not be loaded."),
    summary: result(summary, "Platform summary metrics could not be loaded."),
  };
}

import "server-only";

import { createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { DashboardRangeState } from "./dashboard-range";
import type { DashboardResult, VendorSales, VendorSummary } from "./dashboard-data";

export type ConnectStatus = components["schemas"]["ConnectStatusSuccess"]["data"];
export type EarningsLedger = components["schemas"]["VendorEarningsSuccess"]["data"];
export type EarningsSummary = components["schemas"]["EarningsSummarySuccess"]["data"];
export type PayoutHistory = components["schemas"]["VendorPayoutsSuccess"]["data"];
export type TopProducts = components["schemas"]["VendorTopProductsSuccess"]["data"];

export type VendorEarningsData = Readonly<{
  connect: DashboardResult<ConnectStatus>;
  earnings: DashboardResult<EarningsLedger>;
  ledgerSummary: DashboardResult<EarningsSummary>;
  payouts: DashboardResult<PayoutHistory>;
  sales: DashboardResult<VendorSales>;
  summary: DashboardResult<VendorSummary>;
  topProducts: DashboardResult<TopProducts>;
}>;

export type EarningsPageState = Readonly<{ earningsPage: number; payoutPage: number }>;

function result<T>(settled: PromiseSettledResult<T>, message: string): DashboardResult<T> {
  return settled.status === "fulfilled"
    ? { data: settled.value, status: "success" }
    : { message, status: "error" };
}

export async function getVendorEarningsData(
  range: DashboardRangeState,
  pages: EarningsPageState = { earningsPage: 1, payoutPage: 1 },
): Promise<VendorEarningsData> {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new Error("Vendor earnings configuration is unavailable");

  const client = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
  const dateQuery = { endDate: range.endDate, startDate: range.startDate };
  const summaryRequest: Promise<VendorSummary> = client
    .GET("/analytics/vendor/summary", { params: { query: dateQuery } })
    .then(({ data }) => {
      if (!data) throw new Error("Summary response is empty");
      return data.data;
    });
  const salesRequest: Promise<VendorSales> = client
    .GET("/analytics/vendor/sales", {
      params: { query: { ...dateQuery, period: range.period } },
    })
    .then(({ data }) => {
      if (!data) throw new Error("Sales response is empty");
      return data.data as VendorSales;
    });
  const topProductsRequest: Promise<TopProducts> = client
    .GET("/analytics/vendor/top-products", {
      params: { query: { ...dateQuery, limit: 10 } },
    })
    .then(({ data }) => {
      if (!data) throw new Error("Top products response is empty");
      return data.data as TopProducts;
    });
  const ledgerSummaryRequest: Promise<EarningsSummary> = client
    .GET("/vendor-payouts/earnings/summary")
    .then(({ data }) => {
      if (!data) throw new Error("Ledger summary response is empty");
      return data.data;
    });
  const earningsRequest: Promise<EarningsLedger> = client
    .GET("/vendor-payouts/earnings", {
      params: { query: { ...dateQuery, limit: 10, page: pages.earningsPage } },
    })
    .then(({ data }) => {
      if (!data) throw new Error("Earnings response is empty");
      return data.data as EarningsLedger;
    });
  const payoutsRequest: Promise<PayoutHistory> = client
    .GET("/vendor-payouts/payouts", {
      params: { query: { limit: 10, page: pages.payoutPage } },
    })
    .then(({ data }) => {
      if (!data) throw new Error("Payout response is empty");
      return data.data as PayoutHistory;
    });
  const connectRequest: Promise<ConnectStatus> = client
    .GET("/vendor-payouts/connect/status")
    .then(({ data }) => {
      if (!data) throw new Error("Connect status response is empty");
      return data.data;
    });
  const [summary, sales, topProducts, ledgerSummary, earnings, payouts, connect] =
    await Promise.allSettled([
      summaryRequest,
      salesRequest,
      topProductsRequest,
      ledgerSummaryRequest,
      earningsRequest,
      payoutsRequest,
      connectRequest,
    ] as const);

  return {
    connect: result(connect, "Payout availability could not be checked."),
    earnings: result(earnings, "Earning records could not be loaded."),
    ledgerSummary: result(ledgerSummary, "Payout balances could not be loaded."),
    payouts: result(payouts, "Payout history could not be loaded."),
    sales: result(sales, "Revenue history could not be loaded."),
    summary: result(summary, "Earnings totals could not be loaded."),
    topProducts: result(topProducts, "Top products could not be loaded."),
  };
}

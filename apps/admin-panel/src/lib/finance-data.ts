import "server-only";
import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { FinanceState } from "./finance-state";
import type { CommissionSetting } from "./commission-data";

export type AdminFinanceReport = components["schemas"]["AdminRevenueSuccess"]["data"];
export type FinanceResult<T> =
  | Readonly<{ data: T; status: "success" }>
  | Readonly<{ message: string; status: "error" }>;
export type AdminFinanceData = Readonly<{
  commission: FinanceResult<CommissionSetting>;
  report: FinanceResult<AdminFinanceReport>;
}>;
const result = <T>(settled: PromiseSettledResult<T>, message: string): FinanceResult<T> =>
  settled.status === "fulfilled"
    ? { data: settled.value, status: "success" }
    : {
        message: settled.reason instanceof ApiClientError ? settled.reason.message : message,
        status: "error",
      };

export async function getAdminFinanceData(state: FinanceState): Promise<AdminFinanceData> {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const baseUrl = process.env.API_BASE_URL;
  if (!accessToken || !baseUrl) throw new Error("Finance service is unavailable");
  const client = createApiClient({ baseUrl, getAccessToken: () => accessToken });
  const [report, commission] = await Promise.allSettled([
    client
      .GET("/admin/revenue", {
        params: {
          query: { endDate: state.endDate, period: state.period, startDate: state.startDate },
        },
      })
      .then(({ data }) => {
        if (!data) throw new Error("Finance response is empty");
        return data.data as unknown as AdminFinanceReport;
      }),
    client.GET("/admin/commission").then(({ data }) => {
      if (!data) throw new Error("Commission response is empty");
      return data.data as CommissionSetting;
    }),
  ]);
  return {
    commission: result(commission, "Commission settings could not be loaded."),
    report: result(report, "Financial reporting data could not be loaded."),
  };
}

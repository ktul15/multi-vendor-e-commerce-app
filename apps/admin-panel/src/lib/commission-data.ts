import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";

export type CommissionSetting = components["schemas"]["CommissionSuccess"]["data"];

export class CommissionDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "CommissionDataError";
    this.status = status;
  }
}

export async function getDefaultCommission(): Promise<CommissionSetting> {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) {
    throw new CommissionDataError("Commission service is unavailable", 503);
  }

  try {
    const client = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
    const { data } = await client.GET("/admin/commission");
    if (!data) throw new CommissionDataError("Commission response is empty");
    return data.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new CommissionDataError(error.message, error.status);
    }
    if (error instanceof CommissionDataError) throw error;
    throw new CommissionDataError("Commission settings could not be loaded");
  }
}

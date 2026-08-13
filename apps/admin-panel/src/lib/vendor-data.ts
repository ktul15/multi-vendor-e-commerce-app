import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { VendorListState } from "./vendor-list-state";
import { vendorListQuery } from "./vendor-list-state";

export type AdminVendor = components["schemas"]["AdminVendorSummary"];
export type AdminVendorDetail = components["schemas"]["AdminVendorDetail"];
export type AdminVendors = components["schemas"]["AdminVendorsSuccess"]["data"];

export class VendorDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "VendorDataError";
    this.status = status;
  }
}

async function vendorClient() {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new VendorDataError("Vendor service is unavailable", 503);
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

function dataError(error: unknown, fallback: string): never {
  if (error instanceof ApiClientError) throw new VendorDataError(error.message, error.status);
  if (error instanceof VendorDataError) throw error;
  throw new VendorDataError(fallback);
}

export async function getAdminVendors(state: VendorListState): Promise<AdminVendors> {
  try {
    const client = await vendorClient();
    const { data } = await client.GET("/admin/vendors", {
      params: { query: vendorListQuery(state) },
    });
    if (!data) throw new VendorDataError("Vendors response is empty");
    return data.data as AdminVendors;
  } catch (error) {
    dataError(error, "Vendors could not be loaded");
  }
}

export async function getAdminVendor(vendorProfileId: string): Promise<AdminVendorDetail> {
  try {
    const client = await vendorClient();
    const { data } = await client.GET("/admin/vendors/{vendorProfileId}", {
      params: { path: { vendorProfileId } },
    });
    if (!data) throw new VendorDataError("Vendor response is empty");
    return data.data;
  } catch (error) {
    dataError(error, "Vendor details could not be loaded");
  }
}

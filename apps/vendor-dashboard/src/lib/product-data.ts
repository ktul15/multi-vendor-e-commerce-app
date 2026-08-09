import "server-only";

import { createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import { productInventoryQuery } from "./product-list-state";
import type { ProductListState } from "./product-list-state";

export type VendorInventory = components["schemas"]["ProductsSuccess"]["data"];
export type VendorProduct = VendorInventory["items"][number];

export async function getVendorInventory(state: ProductListState): Promise<VendorInventory> {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new Error("Vendor inventory configuration is unavailable");

  const client = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
  const { data } = await client.GET("/products/vendor", {
    params: { query: productInventoryQuery(state) },
  });
  if (!data) throw new Error("Vendor inventory response is empty");
  return data.data as VendorInventory;
}

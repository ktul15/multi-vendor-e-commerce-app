import "server-only";

import { createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import { orderListQuery } from "./order-list-state";
import type { OrderListState } from "./order-list-state";

export type VendorOrder = components["schemas"]["VendorOrderDetail"];
export type VendorOrders = components["schemas"]["VendorOrdersSuccess"]["data"];

async function orderClient() {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new Error("Vendor order configuration is unavailable");
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

export async function getVendorOrders(state: OrderListState): Promise<VendorOrders> {
  const client = await orderClient();
  const { data } = await client.GET("/orders/vendor", {
    params: { query: orderListQuery(state) },
  });
  if (!data) throw new Error("Vendor orders response is empty");
  return data.data as unknown as VendorOrders;
}

export async function getVendorOrder(id: string): Promise<VendorOrder> {
  const client = await orderClient();
  const { data } = await client.GET("/orders/vendor/{id}", { params: { path: { id } } });
  if (!data) throw new Error("Vendor order response is empty");
  return data.data as unknown as VendorOrder;
}

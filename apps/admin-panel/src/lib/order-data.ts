import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { OrderListState } from "./order-list-state";
import { orderListQuery } from "./order-list-state";

export type AdminOrder = components["schemas"]["AdminOrderSummary"];
export type AdminOrderDetail = components["schemas"]["AdminOrderDetail"];
export type AdminOrders = components["schemas"]["AdminOrdersSuccess"]["data"];

export class OrderDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "OrderDataError";
    this.status = status;
  }
}

async function orderClient() {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new OrderDataError("Order service is unavailable", 503);
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

function dataError(error: unknown, fallback: string): never {
  if (error instanceof ApiClientError) throw new OrderDataError(error.message, error.status);
  if (error instanceof OrderDataError) throw error;
  throw new OrderDataError(fallback);
}

export async function getAdminOrders(state: OrderListState): Promise<AdminOrders> {
  try {
    const client = await orderClient();
    const { data } = await client.GET("/admin/orders", {
      params: { query: orderListQuery(state) },
    });
    if (!data) throw new OrderDataError("Orders response is empty");
    return data.data as AdminOrders;
  } catch (error) {
    dataError(error, "Orders could not be loaded");
  }
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderDetail> {
  try {
    const client = await orderClient();
    const { data } = await client.GET("/admin/orders/{orderId}", {
      params: { path: { orderId } },
    });
    if (!data) throw new OrderDataError("Order response is empty");
    return data.data as AdminOrderDetail;
  } catch (error) {
    dataError(error, "Order details could not be loaded");
  }
}

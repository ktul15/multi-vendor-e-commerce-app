import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { ProductListState } from "./product-list-state";
import { productListQuery } from "./product-list-state";

export type AdminProduct = components["schemas"]["AdminProductListItem"];
export type AdminProductDetail = components["schemas"]["AdminProductDetail"];
export type AdminProducts = components["schemas"]["AdminProductsSuccess"]["data"];

export class ProductDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ProductDataError";
    this.status = status;
  }
}

async function productClient() {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl)
    throw new ProductDataError("Product service is unavailable", 503);
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

function dataError(error: unknown, fallback: string): never {
  if (error instanceof ApiClientError) throw new ProductDataError(error.message, error.status);
  if (error instanceof ProductDataError) throw error;
  throw new ProductDataError(fallback);
}

export async function getAdminProducts(state: ProductListState): Promise<AdminProducts> {
  try {
    const client = await productClient();
    const { data } = await client.GET("/admin/products", {
      params: { query: productListQuery(state) },
    });
    if (!data) throw new ProductDataError("Products response is empty");
    return data.data as AdminProducts;
  } catch (error) {
    dataError(error, "Products could not be loaded");
  }
}

export async function getAdminProduct(productId: string): Promise<AdminProductDetail> {
  try {
    const client = await productClient();
    const { data } = await client.GET("/admin/products/{productId}", {
      params: { path: { productId } },
    });
    if (!data) throw new ProductDataError("Product response is empty");
    return data.data as AdminProductDetail;
  } catch (error) {
    dataError(error, "Product details could not be loaded");
  }
}

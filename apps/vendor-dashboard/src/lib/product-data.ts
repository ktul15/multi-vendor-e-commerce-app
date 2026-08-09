import "server-only";

import { createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import { productInventoryQuery } from "./product-list-state";
import type { ProductListState } from "./product-list-state";

export type VendorInventory = components["schemas"]["ProductsSuccess"]["data"];
export type VendorProduct = VendorInventory["items"][number];
export type Category = Readonly<{ children: Category[]; id: string; name: string }>;
export type EditableProduct = Readonly<{
  basePrice: string;
  categoryId: string;
  description: string;
  id: string;
  images: string[];
  isActive: boolean;
  media: Array<Readonly<{ url: string }>>;
  name: string;
  tags: string[];
  variants: Array<
    Readonly<{
      color?: string | null;
      id: string;
      price: string;
      size?: string | null;
      sku: string;
      stock: number;
    }>
  >;
}>;

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

function authenticatedClient(accessToken: string, apiBaseUrl: string) {
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

export async function getProductFormData(id?: string) {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new Error("Product form configuration is unavailable");
  const client = authenticatedClient(accessToken, apiBaseUrl);
  const [categoriesResponse, productResponse] = await Promise.all([
    client.GET("/categories"),
    id
      ? client.GET("/products/vendor/{id}", { params: { path: { id } } })
      : Promise.resolve(undefined),
  ]);
  if (!categoriesResponse.data) throw new Error("Category response is empty");
  if (id && !productResponse?.data) throw new Error("Product response is empty");
  return {
    categories: categoriesResponse.data.data as unknown as Category[],
    product: productResponse?.data?.data as unknown as EditableProduct | undefined,
  };
}

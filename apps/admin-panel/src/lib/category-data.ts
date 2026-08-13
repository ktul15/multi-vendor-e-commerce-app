import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";

export type AdminCategory = components["schemas"]["Category"];
export type AdminCategoryTreeNode = components["schemas"]["CategoryTreeNode"];

export class CategoryDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "CategoryDataError";
    this.status = status;
  }
}

export async function getAdminCategories(): Promise<readonly AdminCategoryTreeNode[]> {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) throw new CategoryDataError("Category service is unavailable", 503);
  try {
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const { data } = await client.GET("/categories");
    if (!data) throw new CategoryDataError("Categories response is empty");
    return data.data as readonly AdminCategoryTreeNode[];
  } catch (error) {
    if (error instanceof ApiClientError) throw new CategoryDataError(error.message, error.status);
    if (error instanceof CategoryDataError) throw error;
    throw new CategoryDataError("Categories could not be loaded");
  }
}

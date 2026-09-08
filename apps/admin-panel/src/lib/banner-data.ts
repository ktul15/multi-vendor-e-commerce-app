import "server-only";
import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import { bannerListQuery } from "./banner-list-state";
import type { BannerListState } from "./banner-list-state";

export type AdminBanner = components["schemas"]["Banner"];
export type AdminBanners = components["schemas"]["BannerListSuccess"]["data"];
export class BannerDataError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "BannerDataError";
  }
}
async function client() {
  const token = (await cookies()).get("admin_access_token")?.value;
  const baseUrl = process.env.API_BASE_URL;
  if (!token || !baseUrl) throw new BannerDataError("Banner service is unavailable", 503);
  return createApiClient({ baseUrl, getAccessToken: () => token });
}
function fail(error: unknown, fallback: string): never {
  if (error instanceof ApiClientError) throw new BannerDataError(error.message, error.status);
  if (error instanceof BannerDataError) throw error;
  throw new BannerDataError(fallback);
}
export async function getAdminBanners(state: BannerListState): Promise<AdminBanners> {
  try {
    const { data } = await (
      await client()
    ).GET("/banners/all", { params: { query: bannerListQuery(state) } });
    if (!data) throw new BannerDataError("Banner response is empty");
    return data.data as AdminBanners;
  } catch (error) {
    fail(error, "Banners could not be loaded");
  }
}
export async function getAdminBanner(id: string): Promise<AdminBanner> {
  try {
    const { data } = await (await client()).GET("/banners/{id}", { params: { path: { id } } });
    if (!data) throw new BannerDataError("Banner response is empty");
    return data.data;
  } catch (error) {
    fail(error, "Banner could not be loaded");
  }
}

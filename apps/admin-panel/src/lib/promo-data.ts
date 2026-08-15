import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { PromoListState } from "./promo-list-state";
import { promoListQuery } from "./promo-list-state";

export type AdminPromo = components["schemas"]["PromoCodeWithCounts"];
export type AdminPromoDetail = components["schemas"]["PromoCodeDetail"];
export type AdminPromos = components["schemas"]["PromoCodesSuccess"]["data"];

export class PromoDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "PromoDataError";
    this.status = status;
  }
}

async function promoClient() {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new PromoDataError("Promo service is unavailable", 503);
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

function dataError(error: unknown, fallback: string): never {
  if (error instanceof ApiClientError) throw new PromoDataError(error.message, error.status);
  if (error instanceof PromoDataError) throw error;
  throw new PromoDataError(fallback);
}

export async function getAdminPromos(state: PromoListState): Promise<AdminPromos> {
  try {
    const client = await promoClient();
    const { data } = await client.GET("/promo-codes", {
      params: { query: promoListQuery(state) },
    });
    if (!data) throw new PromoDataError("Promo response is empty");
    return data.data as AdminPromos;
  } catch (error) {
    dataError(error, "Promo codes could not be loaded");
  }
}

export async function getAdminPromo(id: string): Promise<AdminPromoDetail> {
  try {
    const client = await promoClient();
    const { data } = await client.GET("/promo-codes/{id}", { params: { path: { id } } });
    if (!data) throw new PromoDataError("Promo response is empty");
    return data.data as AdminPromoDetail;
  } catch (error) {
    dataError(error, "Promo code could not be loaded");
  }
}

import type { components } from "@repo/api-client";
import { isVendorStatus } from "./vendor-access";
import type { VendorAccessProfile } from "./vendor-access";

type VendorProfileEnvelope = components["schemas"]["VendorProfileSuccess"];

export async function requestVendorAccessProfile(
  accessToken: string,
  apiBaseUrl: string,
): Promise<VendorAccessProfile> {
  const response = await fetch(new URL(`${apiBaseUrl.replace(/\/$/, "")}/vendor-profile/me`), {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Vendor profile request failed with status ${response.status}`);

  const payload = (await response.json()) as VendorProfileEnvelope;
  if (!payload.success || !isVendorStatus(payload.data.status)) {
    throw new Error("Vendor profile response is invalid");
  }
  return { status: payload.data.status, storeName: payload.data.storeName };
}

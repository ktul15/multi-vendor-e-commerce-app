import "server-only";

import { cookies } from "next/headers";
import type { VendorAccessProfile } from "./vendor-access";
import { requestVendorAccessProfile, requestVendorProfile } from "./vendor-profile-api";

export async function getVendorAccessProfile(): Promise<VendorAccessProfile> {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  if (!accessToken) throw new Error("Vendor session credentials are missing");
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) throw new Error("API_BASE_URL is required");
  return requestVendorAccessProfile(accessToken, apiBaseUrl);
}

export async function getVendorProfile() {
  const accessToken = (await cookies()).get("vendor_access_token")?.value;
  if (!accessToken) throw new Error("Vendor session credentials are missing");
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) throw new Error("API_BASE_URL is required");
  return requestVendorProfile(accessToken, apiBaseUrl);
}

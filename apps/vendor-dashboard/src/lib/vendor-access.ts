export const vendorStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;

export type VendorStatus = (typeof vendorStatuses)[number];

export type VendorAccessProfile = Readonly<{
  status: VendorStatus;
  storeName: string;
}>;

export function isVendorStatus(value: unknown): value is VendorStatus {
  return typeof value === "string" && vendorStatuses.some((status) => status === value);
}

export function canEditStoreProfile(status: VendorStatus): boolean {
  return status === "PENDING" || status === "APPROVED";
}

export function canUseOperationalFeatures(status: VendorStatus): boolean {
  return status === "APPROVED";
}

export function canRenderVendorRoute(status: VendorStatus, pathname: string): boolean {
  if (canUseOperationalFeatures(status)) return true;
  return pathname === "/store" || pathname.startsWith("/store/");
}

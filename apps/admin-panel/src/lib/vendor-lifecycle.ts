import type { VendorStatus } from "./vendor-list-state";

export type VendorAction = "approve" | "reject" | "suspend";

export function actionsForVendor(status: VendorStatus): readonly VendorAction[] {
  if (status === "PENDING") return ["approve", "reject"];
  if (status === "APPROVED") return ["suspend"];
  if (status === "SUSPENDED") return ["approve", "reject"];
  return ["approve"];
}

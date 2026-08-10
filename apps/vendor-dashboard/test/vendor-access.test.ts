import { describe, expect, it } from "vitest";
import {
  canEditStoreProfile,
  canRenderVendorRoute,
  canUseOperationalFeatures,
  vendorStatuses,
} from "../src/lib/vendor-access";

describe("vendor lifecycle access policy", () => {
  it.each(vendorStatuses)("defines operational access for %s", (status) => {
    expect(canUseOperationalFeatures(status)).toBe(status === "APPROVED");
  });

  it.each([
    ["PENDING", true],
    ["APPROVED", true],
    ["REJECTED", false],
    ["SUSPENDED", false],
  ] as const)("defines store-profile edit access for %s", (status, expected) => {
    expect(canEditStoreProfile(status)).toBe(expected);
  });

  it("limits pending vendors to store routes", () => {
    expect(canRenderVendorRoute("PENDING", "/store")).toBe(true);
    expect(canRenderVendorRoute("PENDING", "/store/media")).toBe(true);
    expect(canRenderVendorRoute("PENDING", "/products")).toBe(false);
  });

  it.each(["REJECTED", "SUSPENDED"] as const)(
    "limits %s vendors to the read-only store route",
    (status) => {
      expect(canRenderVendorRoute(status, "/store")).toBe(true);
      expect(canRenderVendorRoute(status, "/orders")).toBe(false);
    },
  );
});

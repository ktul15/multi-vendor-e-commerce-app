import { describe, expect, it } from "vitest";
import { actionsForVendor } from "../src/lib/vendor-lifecycle";

describe("vendor lifecycle actions", () => {
  it.each([
    ["PENDING", ["approve", "reject"]],
    ["APPROVED", ["suspend"]],
    ["REJECTED", ["approve"]],
    ["SUSPENDED", ["approve", "reject"]],
  ] as const)("maps %s profiles to valid actions", (status, actions) => {
    expect(actionsForVendor(status)).toEqual(actions);
  });
});

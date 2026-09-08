import { describe, expect, it } from "vitest";
import { resolveDashboardAppOrigin } from "../src";

describe("dashboard deployment origin", () => {
  it("uses configured exact origins for stable environments", () => {
    expect(
      resolveDashboardAppOrigin({
        configuredOrigin: "https://vendor.example.com",
        production: true,
      }),
    ).toBe("https://vendor.example.com");
  });

  it("uses Vercel's trusted deployment host for ephemeral previews", () => {
    expect(
      resolveDashboardAppOrigin({
        deploymentEnvironment: "preview",
        production: true,
        vercelUrl: "vendor-git-feature-owner.vercel.app",
      }),
    ).toBe("https://vendor-git-feature-owner.vercel.app");
  });

  it.each(["staging", "production", undefined])(
    "does not use a deployment URL for the %s environment",
    (deploymentEnvironment) => {
      expect(
        resolveDashboardAppOrigin({
          deploymentEnvironment,
          production: true,
          vercelUrl: "vendor-git-main-owner.vercel.app",
        }),
      ).toBeUndefined();
    },
  );

  it.each([
    { configuredOrigin: "https://vendor.example.com/path" },
    { configuredOrigin: "http://vendor.example.com" },
    { vercelUrl: "https://attacker.example" },
    { vercelUrl: "attacker.example/path" },
  ])("rejects unsafe production origin input %#", (input) => {
    expect(
      resolveDashboardAppOrigin({
        deploymentEnvironment: "preview",
        ...input,
        production: true,
      }),
    ).toBeUndefined();
  });
});

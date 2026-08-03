import { describe, expect, it } from "vitest";
import { config, proxy } from "../proxy";

describe("vendor proxy matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it("excludes only the exact API segment while protecting API-prefixed UI routes", () => {
    expect(matcher.test("/api/auth/session")).toBe(false);
    expect(matcher.test("/api")).toBe(false);
    expect(matcher.test("/api-keys")).toBe(true);
    expect(matcher.test("/apiary")).toBe(true);
    expect(matcher.test("/orders")).toBe(true);
  });

  it("exports the shared protection handler", () => {
    expect(proxy).toBeTypeOf("function");
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "../proxy";

const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

const envelope = (data: unknown) =>
  Response.json({ data, message: "ok", success: true }, { status: 200 });

function authenticatedRequest(pathname: string) {
  return new NextRequest(`https://vendor.test${pathname}`, {
    headers: {
      Cookie:
        "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token",
      "X-Real-IP": "203.0.113.10",
    },
  });
}

function profileFetch(status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED") {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(envelope(vendor))
    .mockResolvedValueOnce(
      envelope({
        id: "profile-1",
        status,
        storeName: "Maple Market",
        user: vendor,
        userId: vendor.id,
      }),
    );
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

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

  it("redirects restricted operational requests before their page renders", async () => {
    const fetch = profileFetch("SUSPENDED");
    vi.stubGlobal("fetch", fetch);

    const response = await proxy(
      new NextRequest("https://attacker.test/products", {
        headers: authenticatedRequest("/products").headers,
      }),
    );

    expect(response.headers.get("Location")).toBe("https://vendor.test/access");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("allows pending store access but redirects other pending routes", async () => {
    vi.stubGlobal("fetch", profileFetch("PENDING"));
    const storeResponse = await proxy(authenticatedRequest("/store"));
    expect(storeResponse.headers.get("x-middleware-next")).toBe("1");

    vi.stubGlobal("fetch", profileFetch("PENDING"));
    const ordersResponse = await proxy(authenticatedRequest("/orders"));
    expect(ordersResponse.headers.get("Location")).toBe("https://vendor.test/access");
  });

  it("returns an approved vendor from the lifecycle page to the dashboard", async () => {
    vi.stubGlobal("fetch", profileFetch("APPROVED"));

    const response = await proxy(authenticatedRequest("/access"));

    expect(response.headers.get("Location")).toBe("https://vendor.test/");
  });
});

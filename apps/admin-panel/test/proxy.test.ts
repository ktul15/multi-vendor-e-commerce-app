import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "../proxy";

const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin User",
  role: "ADMIN",
};

const envelope = (data: unknown) => Response.json({ data, success: true });

function authenticatedRequest(pathname: string) {
  return new NextRequest(`https://admin.test${pathname}`, {
    headers: {
      Cookie:
        "admin_access_token=access; admin_refresh_token=refresh; admin_session_id=session-1; admin_csrf_token=csrf",
      "X-Real-IP": "203.0.113.10",
    },
  });
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://admin.test";
  vi.unstubAllGlobals();
});

describe("admin proxy", () => {
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

  it("redirects missing sessions before protected content renders and preserves a safe return path", async () => {
    const response = await proxy(
      new NextRequest("https://attacker.test/orders?page=2", {
        headers: { "X-Real-IP": "203.0.113.10" },
      }),
    );

    expect(response.headers.get("Location")).toBe(
      "https://admin.test/login?returnTo=%2Forders%3Fpage%3D2",
    );
    expect(response.cookies.getAll()).toHaveLength(4);
  });

  it("allows only ADMIN profiles and never forwards wrong-role context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope({ ...admin, role: "VENDOR" })),
    );
    const forbidden = await proxy(authenticatedRequest("/users"));
    expect(forbidden.headers.get("Location")).toBe("https://admin.test/forbidden");
    expect(forbidden.headers.get("x-middleware-request-x-dashboard-verified-session")).toBeNull();
    expect(forbidden.cookies.getAll()).toHaveLength(4);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope(admin)),
    );
    const allowed = await proxy(authenticatedRequest("/users"));
    expect(allowed.headers.get("x-middleware-next")).toBe("1");
    expect(allowed.headers.get("x-middleware-request-x-dashboard-verified-session")).toBeTruthy();
  });

  it.each([
    "/",
    "/categories",
    "/users",
    "/vendors",
    "/products",
    "/orders",
    "/finance",
    "/banners",
    "/promos",
  ])("protects the parity route %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const headerState = vi.hoisted(() => ({ current: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => headerState.current,
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new Error(`redirect:${location}`);
  },
}));

import { createNextDashboardAuth } from "../src/next";

const auth = createNextDashboardAuth({
  apiBaseUrl: () => "https://api.example.test/api/v1",
  appOrigin: () => "https://vendor.example.test",
  dashboard: "vendor",
  requiredRole: "VENDOR",
  secure: () => true,
});

const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data, success: status < 400 }), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const authenticatedRequest = (origin = "https://vendor.example.test") =>
  new NextRequest(`${origin}/orders?page=2`, {
    headers: {
      Cookie:
        "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=opaque-session; vendor_csrf_token=csrf-token",
    },
  });

beforeEach(() => {
  headerState.current = new Headers();
  vi.unstubAllGlobals();
});

describe("Next.js dashboard auth adapter", () => {
  it("uses the trusted configured origin for every redirect", () => {
    const request = new NextRequest("https://attacker.example/orders?page=2");
    expect(auth.loginLocation(request).toString()).toBe(
      "https://vendor.example.test/login?returnTo=%2Forders%3Fpage%3D2",
    );
    expect(auth.forbiddenLocation().toString()).toBe("https://vendor.example.test/forbidden");
    expect(auth.logoutResponse(request).headers.get("Location")).toBe(
      "https://vendor.example.test/login",
    );
  });

  it("validates same-origin CSRF mutations", () => {
    const request = new NextRequest("https://vendor.example.test/api/auth/logout", {
      headers: {
        Cookie: "vendor_csrf_token=csrf-token",
        Origin: "https://vendor.example.test",
        "Sec-Fetch-Site": "same-origin",
        "X-CSRF-Token": "csrf-token",
      },
      method: "POST",
    });
    expect(auth.validMutation(request)).toBe(true);
  });

  it("clears every session cookie and redirects logout to login", () => {
    const request = new NextRequest("https://attacker.example/api/auth/logout", {
      method: "POST",
    });
    const response = auth.logoutResponse(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("https://vendor.example.test/login");
    expect(response.cookies.getAll()).toHaveLength(4);
    expect(response.cookies.getAll().every((cookie) => cookie.value === "")).toBe(true);
  });

  it("reports backend revocation failure without retaining the browser session", () => {
    const request = new NextRequest("https://vendor.example.test/api/auth/logout", {
      method: "POST",
    });
    const response = auth.logoutResponse(request, true);

    expect(response.headers.get("X-Session-Revocation")).toBe("failed");
    expect(response.cookies.getAll()).toHaveLength(4);
  });

  it("protects missing sessions before rendering and clears stale cookies", async () => {
    const response = await auth.protectRequest(
      new NextRequest("https://attacker.example/orders?page=2"),
    );

    expect(response.headers.get("Location")).toBe(
      "https://vendor.example.test/login?returnTo=%2Forders%3Fpage%3D2",
    );
    expect(response.cookies.getAll()).toHaveLength(4);
  });

  it("redirects a wrong-role session without forwarding protected context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope({ ...vendor, role: "ADMIN" })),
    );
    const response = await auth.protectRequest(authenticatedRequest("https://attacker.example"));

    expect(response.headers.get("Location")).toBe("https://vendor.example.test/forbidden");
    expect(response.headers.get("x-middleware-request-x-dashboard-verified-session")).toBeNull();
    expect(response.cookies.getAll()).toHaveLength(4);
  });

  it("forwards one verified session to the layout without a second profile request", async () => {
    const fetch = vi.fn(async () => envelope(vendor));
    vi.stubGlobal("fetch", fetch);
    const response = await auth.protectRequest(authenticatedRequest());
    const context = response.headers.get("x-middleware-request-x-dashboard-verified-session");

    expect(context).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    headerState.current = new Headers({ "X-Dashboard-Verified-Session": context as string });
    await expect(auth.requireSession()).resolves.toMatchObject({
      email: vendor.email,
      role: "VENDOR",
      userId: vendor.id,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("propagates a transient session failure to the server error boundary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    const response = await auth.protectRequest(authenticatedRequest());

    expect(response.headers.get("x-middleware-request-x-dashboard-session-error")).toBe(
      "unavailable",
    );
    headerState.current = new Headers({ "X-Dashboard-Session-Error": "unavailable" });
    await expect(auth.requireSession()).rejects.toMatchObject({ status: 503 });
  });

  it("rotates an expired session through the shared session route", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope({ message: "expired" }, 401))
      .mockResolvedValueOnce(envelope({ accessToken: "new-access", refreshToken: "new-refresh" }))
      .mockResolvedValueOnce(envelope(vendor));
    vi.stubGlobal("fetch", fetch);

    const response = await auth.sessionResponse(authenticatedRequest());

    expect(response.status).toBe(200);
    expect(response.cookies.getAll()).toHaveLength(4);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({
      "X-Refresh-Rotation-Key": "opaque-session",
    });
  });

  it("revokes through the shared logout route and always clears cookies", async () => {
    const fetch = vi.fn(async () => envelope(null));
    vi.stubGlobal("fetch", fetch);
    const request = new NextRequest("https://vendor.example.test/api/auth/logout", {
      headers: {
        Cookie: "vendor_refresh_token=refresh; vendor_csrf_token=csrf-token",
        Origin: "https://vendor.example.test",
        "Sec-Fetch-Site": "same-origin",
        "X-CSRF-Token": "csrf-token",
      },
      method: "POST",
    });

    const response = await auth.logoutRequest(request);

    expect(response.status).toBe(303);
    expect(response.cookies.getAll()).toHaveLength(4);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

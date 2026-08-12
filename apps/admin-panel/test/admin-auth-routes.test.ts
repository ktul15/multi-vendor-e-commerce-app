import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginRequest, sessionResponse } from "../src/lib/session";

const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin User",
  role: "ADMIN",
};

const envelope = (data: unknown, status = 200) =>
  Response.json({ data, success: status < 400 }, { status });

const authEnvelope = (user = admin) =>
  envelope({
    tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
    user,
  });

function login(body: unknown, origin = "https://admin.test") {
  return new NextRequest("https://admin.test/api/auth/login", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "X-Real-IP": "203.0.113.10",
    },
    method: "POST",
  });
}

function session() {
  return new NextRequest("https://admin.test/api/auth/session", {
    headers: {
      Cookie:
        "admin_access_token=expired; admin_refresh_token=refresh; admin_session_id=session-1; admin_csrf_token=csrf",
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

describe("admin auth routes", () => {
  it("establishes isolated admin cookies after valid login", async () => {
    const fetch = vi.fn(async () => authEnvelope());
    vi.stubGlobal("fetch", fetch);

    const response = await loginRequest(
      login({ email: "ADMIN@example.test", password: "secret123" }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("admin_access_token")?.httpOnly).toBe(true);
    expect(response.cookies.get("vendor_access_token")).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/v1/auth/login",
      expect.objectContaining({
        body: JSON.stringify({ email: "admin@example.test", password: "secret123" }),
        headers: expect.objectContaining({ "X-Dashboard-BFF-Source": "admin" }),
      }),
    );
  });

  it("rejects cross-origin requests and authenticated non-admin accounts", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(authEnvelope({ ...admin, id: "vendor-1", role: "VENDOR" }))
      .mockResolvedValueOnce(envelope(null));
    vi.stubGlobal("fetch", fetch);

    const crossOrigin = await loginRequest(
      login({ email: "admin@example.test", password: "secret123" }, "https://evil.test"),
    );
    expect(crossOrigin.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();

    const wrongRole = await loginRequest(
      login({ email: "vendor@example.test", password: "secret123" }),
    );
    expect(wrongRole.status).toBe(403);
    expect(await wrongRole.json()).toMatchObject({ message: "Admin access required" });
    expect(wrongRole.cookies.getAll()).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rotates an expired admin session and clears an unrecoverable one", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope({ message: "expired" }, 401))
      .mockResolvedValueOnce(envelope({ accessToken: "new-access", refreshToken: "new-refresh" }))
      .mockResolvedValueOnce(envelope(admin));
    vi.stubGlobal("fetch", fetch);

    const rotated = await sessionResponse(session());
    expect(rotated.status).toBe(200);
    expect(rotated.cookies.get("admin_access_token")?.value).toBe("new-access");
    expect(fetch).toHaveBeenCalledTimes(3);

    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(envelope({ message: "expired" }, 401))
        .mockResolvedValueOnce(envelope({ message: "revoked" }, 401)),
    );
    const expired = await sessionResponse(session());
    expect(expired.status).toBe(401);
    expect(expired.cookies.getAll()).toHaveLength(4);
    expect(expired.cookies.getAll().every((cookie) => cookie.value === "")).toBe(true);
  });
});

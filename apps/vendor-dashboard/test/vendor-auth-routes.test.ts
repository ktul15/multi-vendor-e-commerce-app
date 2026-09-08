import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginRequest, logoutRequest, registerRequest } from "../src/lib/session";

const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor Owner",
  role: "VENDOR",
};

const authEnvelope = (user = vendor, status = 200) =>
  new Response(
    JSON.stringify({
      data: {
        tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
        user,
      },
      success: true,
    }),
    { headers: { "Content-Type": "application/json" }, status },
  );

const request = (path: "login" | "register", body: unknown, origin = "https://vendor.test") =>
  new NextRequest(`https://vendor.test/api/auth/${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "X-Real-IP": "203.0.113.10",
    },
    method: "POST",
  });

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

describe("vendor auth BFF routes", () => {
  it("sets an isolated dashboard session after vendor login", async () => {
    const fetch = vi.fn(async () => authEnvelope());
    vi.stubGlobal("fetch", fetch);

    const response = await loginRequest(
      request("login", { email: "vendor@example.test", password: "secret123" }),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.getAll()).toHaveLength(4);
    expect(response.cookies.get("vendor_access_token")?.httpOnly).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/v1/auth/login",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Dashboard-BFF-Client": expect.stringMatching(/^client:[a-f0-9]{64}$/),
          "X-Dashboard-BFF-Identity": expect.stringMatching(/^account:[a-f0-9]{64}$/),
          "X-Dashboard-BFF-Signature": expect.stringMatching(/^[a-f0-9]{64}$/),
          "X-Dashboard-BFF-Source": "vendor",
          "X-Dashboard-BFF-Timestamp": expect.any(String),
        }),
        method: "POST",
      }),
    );
  });

  it("keeps a stable signed client bucket while account identities rotate", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(async () => authEnvelope())
      .mockImplementationOnce(async () => authEnvelope())
      .mockImplementationOnce(async () =>
        Response.json(
          { success: false, message: "Too many dashboard requests, please try again later" },
          { status: 429 },
        ),
      );
    vi.stubGlobal("fetch", fetch);

    const responses = [];
    for (const email of ["first@example.test", "second@example.test", "third@example.test"]) {
      responses.push(await loginRequest(request("login", { email, password: "secret123" })));
    }

    const signedHeaders = fetch.mock.calls.map(
      (call) => call[1]?.headers as Record<string, string>,
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200, 429]);
    expect(new Set(signedHeaders.map((headers) => headers["X-Dashboard-BFF-Client"])).size).toBe(1);
    expect(new Set(signedHeaders.map((headers) => headers["X-Dashboard-BFF-Identity"])).size).toBe(
      3,
    );
  });

  it("forces vendor registration and rejects cross-origin entry", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => authEnvelope(undefined, 201));
    vi.stubGlobal("fetch", fetch);
    const payload = {
      confirmPassword: "secret123",
      email: "vendor@example.test",
      name: "Vendor Owner",
      password: "secret123",
      storeName: "Maple Market",
    };

    const forbidden = await registerRequest(request("register", payload, "https://evil.test"));
    expect(forbidden.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();

    const response = await registerRequest(request("register", payload));
    const backendBody = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      role?: string;
    };
    expect(response.status).toBe(201);
    expect(backendBody.role).toBe("VENDOR");
  });

  it("revokes tokens and refuses non-vendor login", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(authEnvelope({ ...vendor, role: "CUSTOMER" }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: null, success: true }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetch);

    const response = await loginRequest(
      request("login", { email: "buyer@example.test", password: "secret123" }),
    );

    expect(response.status).toBe(403);
    expect(response.cookies.getAll()).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/auth/logout");
  });

  it("clears the complete dashboard session after successful logout", async () => {
    const fetch = vi.fn(async () => Response.json({ data: null, success: true }, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const logout = new NextRequest("https://vendor.test/api/auth/logout", {
      headers: {
        Cookie:
          "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token",
        Origin: "https://vendor.test",
        "Sec-Fetch-Site": "same-origin",
        "X-CSRF-Token": "csrf-token",
        "X-Real-IP": "203.0.113.10",
      },
      method: "POST",
    });

    const response = await logoutRequest(logout);

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("https://vendor.test/login");
    expect(response.cookies.getAll()).toHaveLength(4);
    expect(response.cookies.getAll().every((cookie) => cookie.value === "")).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/v1/auth/logout",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Dashboard-BFF-Identity": "session:session-1",
          "X-Dashboard-BFF-Signature": expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        method: "POST",
      }),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  DashboardAuthError,
  createClearedSessionCookieWrites,
  createDashboardSessionBackend,
  createSessionCookieWrites,
  dashboardCookieNames,
  isValidDashboardMutation,
  loginRedirectPath,
  logoutRedirectPath,
  postLoginReturnPath,
  resolveDashboardSession,
  safeReturnPath,
} from "../src";
import type { DashboardSessionBackend, DashboardUser } from "../src";

const vendor: DashboardUser = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

function backend(overrides: Partial<DashboardSessionBackend> = {}): DashboardSessionBackend {
  return {
    getProfile: vi.fn(async () => vendor),
    login: vi.fn(async () => ({
      tokens: { accessToken: "access", refreshToken: "refresh" },
      user: vendor,
    })),
    logout: vi.fn(async () => undefined),
    registerVendor: vi.fn(async () => ({
      tokens: { accessToken: "access", refreshToken: "refresh" },
      user: vendor,
    })),
    refresh: vi.fn(async () => ({ accessToken: "new-access", refreshToken: "new-refresh" })),
    ...overrides,
  };
}

describe("safe dashboard navigation", () => {
  it.each(["//evil.test", "/%2f%2fevil.test", "/\\evil", "https://evil.test", "orders"])(
    "rejects unsafe return path %s",
    (value) => expect(safeReturnPath(value)).toBe("/"),
  );

  it("preserves a relative path, query, and fragment", () => {
    expect(safeReturnPath("/orders?page=2#pending")).toBe("/orders?page=2#pending");
    expect(loginRedirectPath("/orders?page=2")).toBe("/login?returnTo=%2Forders%3Fpage%3D2");
  });

  it("prevents login redirect loops and uses login after logout", () => {
    expect(loginRedirectPath("/login?returnTo=/orders")).toBe("/login");
    expect(postLoginReturnPath("/login?returnTo=/orders")).toBe("/");
    expect(logoutRedirectPath()).toBe("/login");
  });
});

describe("dashboard mutation protection", () => {
  const request = {
    appOrigin: "https://vendor.example.test",
    cookieToken: "csrf-token",
    fetchSite: "same-origin",
    headerToken: "csrf-token",
    origin: "https://vendor.example.test",
  };

  it("accepts an exact same-origin request with a matching token", () => {
    expect(isValidDashboardMutation(request)).toBe(true);
  });

  it.each([
    { origin: "https://attacker.example" },
    { origin: null },
    { fetchSite: "cross-site" },
    { headerToken: "wrong-token" },
  ])("rejects an unsafe mutation variant %#", (override) => {
    expect(isValidDashboardMutation({ ...request, ...override })).toBe(false);
  });
});

describe("dashboard authentication backend", () => {
  it("parses login tokens and forces vendor registration role", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        data: {
          tokens: { accessToken: "access", refreshToken: "refresh" },
          user: vendor,
        },
        success: true,
      }),
    );
    const sessionBackend = createDashboardSessionBackend({
      apiBaseUrl: "https://api.example.test/api/v1",
      bffSecret: "test-dashboard-bff-secret-with-32-characters",
      clientKey: "203.0.113.10",
      dashboard: "vendor",
      fetch,
    });

    await expect(
      sessionBackend.login({ email: vendor.email, password: "secret123" }),
    ).resolves.toMatchObject({ user: { role: "VENDOR" } });
    await sessionBackend.registerVendor({
      email: vendor.email,
      name: vendor.name,
      password: "secret123",
      storeName: "Vendor Store",
    });

    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      role: "VENDOR",
      storeName: "Vendor Store",
    });
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "X-Dashboard-BFF-Client": expect.stringMatching(/^client:[a-f0-9]{64}$/),
      "X-Dashboard-BFF-Identity": expect.stringMatching(/^account:[a-f0-9]{64}$/),
      "X-Dashboard-BFF-Signature": expect.stringMatching(/^[a-f0-9]{64}$/),
      "X-Dashboard-BFF-Source": "vendor",
      "X-Dashboard-BFF-Timestamp": expect.any(String),
    });
  });

  it("preserves backend field errors for forms", async () => {
    const sessionBackend = createDashboardSessionBackend({
      apiBaseUrl: "https://api.example.test/api/v1",
      fetch: vi.fn(async () =>
        Response.json(
          {
            errors: [{ field: "storeName", message: "Store name must be unique" }],
            message: "A store with this name already exists",
            success: false,
          },
          { status: 409 },
        ),
      ),
    });

    await expect(
      sessionBackend.registerVendor({
        email: vendor.email,
        name: vendor.name,
        password: "secret123",
        storeName: "Vendor Store",
      }),
    ).rejects.toMatchObject({
      fieldErrors: [{ field: "storeName", message: "Store name must be unique" }],
      status: 409,
    });
  });
});

describe("dashboard cookies", () => {
  it("uses distinct names and browser-safe visibility", () => {
    expect(dashboardCookieNames("vendor").access).not.toBe(dashboardCookieNames("admin").access);
    const writes = createSessionCookieWrites({
      dashboard: "vendor",
      secure: true,
      sessionId: "opaque-session",
      tokens: { accessToken: "access", refreshToken: "refresh" },
    });
    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "vendor_access_token",
          options: expect.objectContaining({ httpOnly: true, path: "/", secure: true }),
        }),
        expect.objectContaining({
          name: "vendor_refresh_token",
          options: expect.objectContaining({ httpOnly: true }),
        }),
        expect.objectContaining({
          name: "vendor_csrf_token",
          options: expect.objectContaining({ httpOnly: false }),
        }),
        expect.objectContaining({ name: "vendor_session_id", value: "opaque-session" }),
      ]),
    );
  });

  it("clears every dashboard cookie", () => {
    expect(createClearedSessionCookieWrites("admin", true)).toHaveLength(4);
    expect(
      createClearedSessionCookieWrites("admin", true).every((entry) => entry.options.maxAge === 0),
    ).toBe(true);
  });
});

describe("resolveDashboardSession", () => {
  it("rejects missing sessions", async () => {
    await expect(
      resolveDashboardSession({ backend: backend(), credentials: {}, requiredRole: "VENDOR" }),
    ).resolves.toEqual({ kind: "unauthenticated" });
  });

  it("enforces vendor and admin roles independently", async () => {
    const sessionBackend = backend();
    await expect(
      resolveDashboardSession({
        backend: sessionBackend,
        credentials: { accessToken: "access" },
        requiredRole: "VENDOR",
      }),
    ).resolves.toMatchObject({ kind: "authenticated", session: { role: "VENDOR" } });
    await expect(
      resolveDashboardSession({
        backend: sessionBackend,
        credentials: { accessToken: "access" },
        requiredRole: "ADMIN",
      }),
    ).resolves.toEqual({ actualRole: "VENDOR", kind: "forbidden" });
  });

  it("refreshes an expired session once and retries the profile", async () => {
    const getProfile = vi
      .fn<DashboardSessionBackend["getProfile"]>()
      .mockRejectedValueOnce(new DashboardAuthError("expired", 401))
      .mockResolvedValueOnce(vendor);
    const sessionBackend = backend({ getProfile });

    await expect(
      resolveDashboardSession({
        backend: sessionBackend,
        credentials: {
          accessToken: "expired-access",
          refreshToken: "refresh",
          sessionId: "session-1",
        },
        requiredRole: "VENDOR",
      }),
    ).resolves.toMatchObject({
      kind: "authenticated",
      rotatedTokens: { accessToken: "new-access", refreshToken: "new-refresh" },
    });
    expect(sessionBackend.refresh).toHaveBeenCalledTimes(1);
    expect(getProfile).toHaveBeenCalledTimes(2);
  });

  it("coalesces overlapping refreshes by opaque session identifier", async () => {
    let release: ((tokens: { accessToken: string; refreshToken: string }) => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<{ accessToken: string; refreshToken: string }>((resolve) => {
          release = resolve;
        }),
    );
    const sessionBackend = backend({ refresh });
    const input = {
      backend: sessionBackend,
      credentials: { refreshToken: "refresh", sessionId: "opaque-session" },
      requiredRole: "VENDOR" as const,
    };
    const first = resolveDashboardSession(input);
    const second = resolveDashboardSession(input);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    release?.({ accessToken: "new-access", refreshToken: "new-refresh" });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("returns unauthenticated when refresh cannot recover", async () => {
    const sessionBackend = backend({
      getProfile: vi.fn(async () => {
        throw new DashboardAuthError("expired", 401);
      }),
      refresh: vi.fn(async () => {
        throw new DashboardAuthError("revoked", 401);
      }),
    });
    await expect(
      resolveDashboardSession({
        backend: sessionBackend,
        credentials: {
          accessToken: "expired",
          refreshToken: "revoked",
          sessionId: "session-2",
        },
        requiredRole: "VENDOR",
      }),
    ).resolves.toEqual({ kind: "unauthenticated" });
  });

  it("does not turn transient backend failures into false logout", async () => {
    await expect(
      resolveDashboardSession({
        backend: backend({
          getProfile: vi.fn(async () => {
            throw new DashboardAuthError("unavailable", 503);
          }),
        }),
        credentials: { accessToken: "access" },
        requiredRole: "VENDOR",
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
});

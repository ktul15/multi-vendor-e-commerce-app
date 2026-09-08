import { describe, expect, it, vi } from "vitest";
import {
  createDashboardHealthResponse,
  createClientTelemetryRoute,
  createObservedFetch,
  createObservedServerFetch,
  createServerTelemetry,
  sanitizeRoute,
} from "../src";

describe("dashboard observability", () => {
  it("returns an uncached deployment health record", async () => {
    const response = createDashboardHealthResponse({
      app: "vendor",
      environment: "staging",
      now: () => new Date("2026-09-05T00:00:00.000Z"),
      release: "sha-abc123",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      app: "vendor",
      environment: "staging",
      release: "sha-abc123",
      status: "healthy",
      timestamp: "2026-09-05T00:00:00.000Z",
    });
  });

  it("redacts sensitive values and removes identifiers and query strings", () => {
    const records: unknown[] = [];
    createServerTelemetry({
      app: "admin",
      environment: "production",
      now: () => new Date("2026-08-18T00:00:00.000Z"),
      release: "sha-abc123",
      write: (record) => records.push(record),
    }).capture({
      category: "auth",
      error: new Error("password=hunter2 Bearer abc.def.ghi alice@example.com 4242 4242 4242 4242"),
      operation: "POST /api/auth/login",
      requestId: "request-1",
      route: "/users/11111111-1111-4111-8111-111111111111?email=alice@example.com",
      runtime: "server",
      status: 503,
    });

    expect(records).toEqual([
      expect.objectContaining({
        app: "admin",
        environment: "production",
        release: "sha-abc123",
        requestId: "request-1",
        route: "/users/[id]",
      }),
    ]);
    expect(JSON.stringify(records)).not.toMatch(/hunter2|abc\.def|alice@example|4242/);
  });

  it("normalizes route context without retaining query data", () => {
    expect(sanitizeRoute("https://admin.test/orders/42?token=secret")).toBe("/orders/[id]");
  });

  it("redacts complete authorization and cookie header values", () => {
    const records: unknown[] = [];
    createServerTelemetry({ app: "admin", write: (record) => records.push(record) }).capture({
      category: "auth",
      error: new Error(
        "Authorization: Bearer opaque-token\nCookie: session=secret-one; refresh=secret-two\nSet-Cookie: access=secret-three; HttpOnly",
      ),
      operation: "POST /api/auth/login",
      route: "/login",
      runtime: "server",
    });

    const serialized = JSON.stringify(records);
    expect(serialized).toContain("Authorization=[REDACTED]");
    expect(serialized).toContain("Cookie=[REDACTED]");
    expect(serialized).not.toMatch(/opaque-token|secret-one|secret-two|secret-three/);
  });

  it("accepts only same-origin bounded client events and enriches server context", async () => {
    const records: unknown[] = [];
    const route = createClientTelemetryRoute({
      app: "vendor",
      appOrigin: "https://vendor.test",
      environment: "staging",
      release: "release-7",
      write: (record) => records.push(record),
    });
    const payload = JSON.stringify({
      category: "upload",
      error: { message: "token=secret vendor@example.com", name: "UploadError" },
      operation: "POST /api/products/[id]/media",
      requestId: "request-7",
      route: "/products/11111111-1111-4111-8111-111111111111/edit?tab=media",
      status: 503,
    });

    const accepted = await route(
      new Request("https://vendor.test/api/telemetry", {
        body: payload,
        headers: { "Content-Type": "application/json", Origin: "https://vendor.test" },
        method: "POST",
      }),
    );
    expect(accepted.status).toBe(202);
    expect(records).toEqual([
      expect.objectContaining({
        app: "vendor",
        category: "upload",
        environment: "staging",
        release: "release-7",
        route: "/products/[id]/edit",
      }),
    ]);
    expect(JSON.stringify(records)).not.toContain("vendor@example.com");

    const rejected = await route(
      new Request("https://vendor.test/api/telemetry", {
        body: payload,
        headers: { Origin: "https://attacker.test" },
        method: "POST",
      }),
    );
    expect(rejected.status).toBe(403);
  });

  it.each([
    ["/api/auth/login", "POST", "application/json", "auth"],
    ["/api/products", "GET", undefined, "api"],
    ["/api/products/1", "DELETE", undefined, "mutation"],
    ["/api/products/1/media", "POST", "multipart/form-data; boundary=x", "upload"],
  ] as const)(
    "classifies failed %s requests as %s telemetry",
    async (path, method, contentType, category) => {
      const report = vi.fn();
      const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 503 }));
      const observed = createObservedFetch({
        currentRoute: () => "/products/1/edit?tab=media",
        fetch,
        origin: "https://vendor.test",
        report,
        requestId: () => "request-fixed",
      });

      await observed(`https://vendor.test${path}`, {
        ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
        method,
      });

      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({ category, requestId: "request-fixed", status: 503 }),
      );
      expect(fetch.mock.calls[0]?.[0]).toBeInstanceOf(Request);
      expect((fetch.mock.calls[0]?.[0] as Request).headers.get("X-Dashboard-Request-ID")).toBe(
        "request-fixed",
      );
    },
  );

  it("does not observe cross-origin or telemetry delivery requests", async () => {
    const report = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 500 }));
    const observed = createObservedFetch({
      currentRoute: () => "/",
      fetch,
      origin: "https://admin.test",
      report,
    });

    await observed("https://api.example.test/data");
    await observed("https://admin.test/api/telemetry", { method: "POST" });

    expect(report).not.toHaveBeenCalled();
  });

  it("reports handled server API failures and bypasses requests outside the API base", async () => {
    const report = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 503 }));
    const observed = createObservedServerFetch({
      apiBaseUrl: "https://api.example.test/api/v1",
      fetch,
      report,
      requestId: () => "server-request-fixed",
    });

    await observed("https://api.example.test/api/v1/admin/users/42", { method: "GET" });
    await observed("https://api.example.test/health", { method: "GET" });

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({
      category: "api",
      error: expect.objectContaining({ message: "HTTP 503" }),
      operation: "GET /api/v1/admin/users/[id]",
      requestId: "server-request-fixed",
      route: "/api/v1/admin/users/[id]",
      runtime: "server",
      status: 503,
    });
    expect(fetch.mock.calls[0]?.[0]).toBeInstanceOf(Request);
    expect((fetch.mock.calls[0]?.[0] as Request).headers.get("X-Dashboard-Request-ID")).toBe(
      "server-request-fixed",
    );
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.example.test/health");
  });

  it("does not report the expected unauthenticated session bootstrap", async () => {
    const report = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ success: false }, { status: 401 }),
    );
    const observed = createObservedFetch({
      currentRoute: () => "/login",
      fetch,
      origin: "https://admin.test",
      report,
    });

    await observed("https://admin.test/api/auth/session");

    expect(report).not.toHaveBeenCalled();
  });

  it("does not report intentional request cancellation", async () => {
    const report = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new DOMException("The operation was aborted", "AbortError");
    });
    const observed = createObservedFetch({
      currentRoute: () => "/login",
      fetch,
      origin: "https://vendor.test",
      report,
    });

    await expect(observed("https://vendor.test/api/auth/session")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(report).not.toHaveBeenCalled();
  });
});

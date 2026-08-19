import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "../app/api/orders/[id]/status/route";

const orderId = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id: orderId }) };
const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

function request(body: unknown, csrf = true) {
  return new NextRequest(`https://vendor.test/api/orders/${orderId}/status`, {
    body: JSON.stringify(body),
    headers: {
      Cookie:
        "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token",
      "Content-Type": "application/json",
      "Idempotency-Key": "11111111-2222-4333-8444-555555555555",
      Origin: "https://vendor.test",
      "Sec-Fetch-Site": "same-origin",
      ...(csrf ? { "X-CSRF-Token": "csrf-token" } : {}),
      "X-Real-IP": "203.0.113.10",
    },
    method: "PUT",
  });
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

describe("vendor order status BFF", () => {
  it("requires CSRF and complete tracking before resolving a session", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await PUT(request({ status: "CONFIRMED" }, false), params)).status).toBe(403);
    expect((await PUT(request({ status: "SHIPPED" }), params)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards the validated transition and preserves concurrency errors", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: vendor, message: "Vendor retrieved", success: true }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { message: "Order status changed. Refresh and try again", success: false },
          { headers: { "Idempotency-Status": "ambiguous", "Retry-After": "2" }, status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetch);

    const response = await PUT(request({ status: "CONFIRMED" }), params);
    expect(response.status).toBe(409);
    expect(response.headers.get("Idempotency-Status")).toBe("ambiguous");
    expect(response.headers.get("Retry-After")).toBe("2");
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `https://api.test/api/v1/orders/vendor/${orderId}/status`,
    );
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "PUT" });
    expect(new Headers(fetch.mock.calls[1]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "11111111-2222-4333-8444-555555555555",
    );
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining("Refresh"),
    });
  });
});

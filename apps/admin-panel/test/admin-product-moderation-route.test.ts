import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "../app/api/products/[id]/moderation/route";

const productId = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id: productId }) };
const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin",
  role: "ADMIN",
};

function request(body: unknown, csrf = true) {
  return new NextRequest(`https://admin.test/api/products/${productId}/moderation`, {
    body: JSON.stringify(body),
    headers: {
      Cookie:
        "admin_access_token=access; admin_refresh_token=refresh; admin_session_id=session-1; admin_csrf_token=csrf-token",
      "Content-Type": "application/json",
      Origin: "https://admin.test",
      "Sec-Fetch-Site": "same-origin",
      ...(csrf ? { "X-CSRF-Token": "csrf-token" } : {}),
      "X-Real-IP": "203.0.113.10",
    },
    method: "PATCH",
  });
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://admin.test";
  vi.unstubAllGlobals();
});

describe("admin product moderation BFF", () => {
  it("rejects missing CSRF, invalid IDs, and unsupported actions before mutation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await PATCH(request({ action: "activate" }, false), params)).status).toBe(403);
    expect(
      (await PATCH(request({ action: "activate" }), { params: Promise.resolve({ id: "invalid" }) }))
        .status,
    ).toBe(400);
    expect((await PATCH(request({ action: "publish" }), params)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards status actions and preserves stale-state conflicts", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(
        Response.json({ message: "Product is already active", success: false }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await PATCH(request({ action: "activate" }), params);
    expect(response.status).toBe(409);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `https://api.test/api/v1/admin/products/${productId}/activate`,
    );
    expect(fetch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "PATCH" }));
    await expect(response.json()).resolves.toMatchObject({ message: "Product is already active" });
  });

  it("forwards permanent deletion and returns an empty 204 response", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const response = await PATCH(request({ action: "delete" }), params);
    expect(response.status).toBe(204);
    expect(fetch.mock.calls[1]?.[0]).toBe(`https://api.test/api/v1/admin/products/${productId}`);
    expect(fetch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
    await expect(response.text()).resolves.toBe("");
  });
});

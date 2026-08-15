import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "../app/api/promos/[id]/route";
import { POST } from "../app/api/promos/route";

const promoId = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id: promoId }) };
const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin",
  role: "ADMIN",
};

function request(method: "DELETE" | "POST" | "PUT", body?: unknown, csrf = true) {
  return new NextRequest(`https://admin.test/api/promos${method === "POST" ? "" : `/${promoId}`}`, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      Cookie:
        "admin_access_token=access; admin_refresh_token=refresh; admin_session_id=session-1; admin_csrf_token=csrf-token",
      "Content-Type": "application/json",
      Origin: "https://admin.test",
      "Sec-Fetch-Site": "same-origin",
      ...(csrf ? { "X-CSRF-Token": "csrf-token" } : {}),
      "X-Real-IP": "203.0.113.10",
    },
    method,
  });
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://admin.test";
  vi.unstubAllGlobals();
});

describe("admin promo mutation BFF", () => {
  it("rejects missing CSRF, invalid IDs, and invalid JSON before mutation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request("POST", {}, false))).status).toBe(403);
    expect(
      (
        await PUT(request("PUT", {}), {
          params: Promise.resolve({ id: "invalid" }),
        })
      ).status,
    ).toBe(400);
    const invalid = request("POST", {});
    Object.defineProperty(invalid, "json", { value: async () => undefined });
    expect((await POST(invalid)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards create and update JSON with authorization", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(
        Response.json({ data: { id: promoId }, success: true }, { status: 201 }),
      )
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(Response.json({ data: { id: promoId }, success: true }));
    vi.stubGlobal("fetch", fetch);
    const create = { code: "SAVE20", discountType: "PERCENTAGE", discountValue: 20 };
    expect((await POST(request("POST", create))).status).toBe(201);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/promo-codes");
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ body: JSON.stringify(create), method: "POST" }),
    );
    expect((await PUT(request("PUT", { isActive: false }), params)).status).toBe(200);
    expect(fetch.mock.calls[3]?.[0]).toBe(`https://api.test/api/v1/promo-codes/${promoId}`);
    expect(fetch.mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({ body: JSON.stringify({ isActive: false }), method: "PUT" }),
    );
  });

  it("forwards archive requests and preserves backend errors", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(
        Response.json({ message: "Promo code not found", success: false }, { status: 404 }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await DELETE(request("DELETE"), params);
    expect(response.status).toBe(404);
    expect(fetch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
    await expect(response.json()).resolves.toMatchObject({ message: "Promo code not found" });
  });
});

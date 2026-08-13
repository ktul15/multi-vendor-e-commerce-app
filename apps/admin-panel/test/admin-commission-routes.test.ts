import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as patchDefault } from "../app/api/commission/route";
import { PATCH as patchVendor } from "../app/api/vendors/[id]/commission/route";

const vendorId = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id: vendorId }) };
const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin",
  role: "ADMIN",
};

function request(path: string, body: unknown, csrf = true) {
  return new NextRequest(`https://admin.test${path}`, {
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

describe("admin commission BFF routes", () => {
  it("rejects CSRF, invalid rates, and invalid vendor IDs before mutation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    expect((await patchDefault(request("/api/commission", { rate: 10 }, false))).status).toBe(403);
    expect((await patchDefault(request("/api/commission", { rate: 101 }))).status).toBe(400);
    expect(
      (
        await patchVendor(request("/api/vendors/invalid/commission", { rate: 10 }), {
          params: Promise.resolve({ id: "invalid" }),
        })
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a validated platform rate and preserves backend failures", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(
        Response.json({ message: "Commission update failed", success: false }, { status: 400 }),
      );
    vi.stubGlobal("fetch", fetch);

    const response = await patchDefault(request("/api/commission", { rate: 12.25 }));
    expect(response.status).toBe(400);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/admin/commission");
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ body: JSON.stringify({ rate: 12.25 }), method: "PATCH" }),
    );
    await expect(response.json()).resolves.toMatchObject({ message: "Commission update failed" });
  });

  it("forwards custom and inherited vendor rates to the profile-scoped endpoint", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(
        Response.json({ data: { commissionRate: null, id: vendorId }, success: true }),
      );
    vi.stubGlobal("fetch", fetch);

    const response = await patchVendor(
      request(`/api/vendors/${vendorId}/commission`, { rate: null }),
      params,
    );
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `https://api.test/api/v1/admin/vendors/${vendorId}/commission`,
    );
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ body: JSON.stringify({ rate: null }), method: "PATCH" }),
    );
  });
});

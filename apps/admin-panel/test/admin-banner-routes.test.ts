import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "../app/api/banners/[id]/route";
import { POST } from "../app/api/banners/route";
const id = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id }) };
const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin",
  role: "ADMIN",
};
function request(method: "DELETE" | "POST" | "PUT", form?: FormData, csrf = true) {
  return new NextRequest(`https://admin.test/api/banners${method === "POST" ? "" : `/${id}`}`, {
    body: form,
    headers: {
      Cookie:
        "admin_access_token=access; admin_refresh_token=refresh; admin_session_id=session-1; admin_csrf_token=csrf-token",
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
describe("admin banner mutation BFF", () => {
  it("rejects missing CSRF and invalid IDs before forwarding", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request("POST", new FormData(), false))).status).toBe(403);
    expect(
      (await PUT(request("PUT", new FormData()), { params: Promise.resolve({ id: "bad" }) }))
        .status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("forwards multipart create and update contracts", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(Response.json({ data: { id }, success: true }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(Response.json({ data: { id }, success: true }));
    vi.stubGlobal("fetch", fetch);
    const create = new FormData();
    create.set("title", "Summer");
    expect((await POST(request("POST", create))).status).toBe(201);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/banners");
    expect((fetch.mock.calls[1]?.[1]?.body as FormData).get("title")).toBe("Summer");
    const update = new FormData();
    update.set("position", "2");
    expect((await PUT(request("PUT", update), params)).status).toBe(200);
    expect(fetch.mock.calls[3]?.[0]).toBe(`https://api.test/api/v1/banners/${id}`);
  });
  it("preserves empty delete responses", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const response = await DELETE(request("DELETE"), params);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

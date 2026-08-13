import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "../app/api/categories/[id]/route";
import { POST } from "../app/api/categories/route";

const categoryId = "11111111-1111-4111-8111-111111111111";
const params = { params: Promise.resolve({ id: categoryId }) };
const admin = {
  avatar: null,
  email: "admin@example.test",
  id: "admin-1",
  name: "Admin",
  role: "ADMIN",
};

function request(method: "DELETE" | "POST" | "PUT", form?: FormData, csrf = true) {
  return new NextRequest(
    `https://admin.test/api/categories${method === "POST" ? "" : `/${categoryId}`}`,
    {
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
    },
  );
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://admin.test";
  vi.unstubAllGlobals();
});

describe("admin category mutation BFF", () => {
  it("rejects missing CSRF and invalid category IDs before mutation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request("POST", new FormData(), false))).status).toBe(403);
    expect(
      (
        await PUT(request("PUT", new FormData()), {
          params: Promise.resolve({ id: "invalid" }),
        })
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards multipart create and edit requests with admin authorization", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(Response.json({ data: { id: categoryId }, success: true }))
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(Response.json({ data: { id: categoryId }, success: true }));
    vi.stubGlobal("fetch", fetch);
    const createForm = new FormData();
    createForm.set("name", "Accessories");
    expect((await POST(request("POST", createForm))).status).toBe(200);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/categories");
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: "Bearer access" },
        method: "POST",
      }),
    );
    expect((fetch.mock.calls[1]?.[1]?.body as FormData).get("name")).toBe("Accessories");

    const editForm = new FormData();
    editForm.set("parentId", "");
    expect((await PUT(request("PUT", editForm), params)).status).toBe(200);
    expect(fetch.mock.calls[3]?.[0]).toBe(`https://api.test/api/v1/categories/${categoryId}`);
    expect(fetch.mock.calls[3]?.[1]).toEqual(expect.objectContaining({ method: "PUT" }));
  });

  it("preserves unsafe-delete explanations from the backend", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: admin, success: true }))
      .mockResolvedValueOnce(
        Response.json(
          { message: "Cannot delete category with attached products", success: false },
          { status: 400 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await DELETE(request("DELETE"), params);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Cannot delete category with attached products",
    });
    expect(fetch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });
});

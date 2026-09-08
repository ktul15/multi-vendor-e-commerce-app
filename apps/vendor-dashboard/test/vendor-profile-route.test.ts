import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "../app/api/vendor-profile/route";

const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

function request(method: "GET" | "PUT", form?: FormData, csrf = true) {
  const nextRequest = new NextRequest("https://vendor.test/api/vendor-profile", {
    headers: {
      Cookie:
        "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token",
      Origin: "https://vendor.test",
      "Sec-Fetch-Site": "same-origin",
      ...(csrf ? { "X-CSRF-Token": "csrf-token" } : {}),
      "X-Real-IP": "203.0.113.10",
    },
    method,
  });
  if (form) vi.spyOn(nextRequest, "formData").mockResolvedValue(form);
  return nextRequest;
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

describe("vendor profile BFF", () => {
  it("requires CSRF and validates multipart fields before resolving a session", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const form = new FormData();
    form.set("storeName", "M");
    form.set("description", "Description");
    expect((await PUT(request("PUT", form, false))).status).toBe(403);
    expect((await PUT(request("PUT", form))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a validated multipart update and preserves backend field errors", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: vendor, success: true }))
      .mockResolvedValueOnce(
        Response.json(
          {
            errors: [{ field: "storeName", message: "Store name must be unique" }],
            message: "A store with this name already exists",
            success: false,
          },
          { status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const form = new FormData();
    form.set("storeName", "Maple Market");
    form.set("description", "Handmade goods");
    form.set("logo", new File(["image"], "logo.webp", { type: "image/webp" }));

    const response = await PUT(request("PUT", form));
    expect(response.status).toBe(409);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/vendor-profile/me");
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "PUT" });
    expect(fetch.mock.calls[1]?.[1]?.body).toBeInstanceOf(FormData);
    await expect(response.json()).resolves.toMatchObject({
      errors: [{ field: "storeName", message: "Store name must be unique" }],
    });
  });

  it("refreshes the profile through the authenticated backend contract", async () => {
    const profile = { id: "profile-1", status: "SUSPENDED", storeName: "Maple Market" };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: vendor, success: true }))
      .mockResolvedValueOnce(Response.json({ data: profile, success: true }));
    vi.stubGlobal("fetch", fetch);

    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/vendor-profile/me");
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ cache: "no-store" });
    await expect(response.json()).resolves.toMatchObject({ data: profile });
  });
});

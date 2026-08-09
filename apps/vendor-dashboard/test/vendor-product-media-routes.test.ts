import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/products/[id]/media/route";
import { DELETE, PUT } from "../app/api/products/[id]/media/[mediaId]/route";

const api = vi.hoisted(() => ({ DELETE: vi.fn(), POST: vi.fn(), PUT: vi.fn() }));
vi.mock("@repo/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/api-client")>()),
  createApiClient: () => api,
}));

const productId = "11111111-1111-4111-8111-111111111111";
const mediaId = "22222222-2222-4222-8222-222222222222";
const routeHeaders = {
  Cookie:
    "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token",
  Origin: "https://vendor.test",
  "Sec-Fetch-Site": "same-origin",
  "X-CSRF-Token": "csrf-token",
  "X-Real-IP": "203.0.113.10",
};
const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};
const mediaResponse = {
  data: [
    {
      createdAt: "2026-08-09T00:00:00.000Z",
      id: mediaId,
      position: 0,
      updatedAt: "2026-08-09T00:00:00.000Z",
      url: "https://images.test/product.webp",
    },
  ],
  message: "Product media updated",
  success: true,
};

function envelope(data: unknown, status = 200) {
  return Response.json({ data, message: "ok", success: true }, { status });
}

function mutationRequest(path: string, method: "DELETE" | "POST" | "PUT", field?: string) {
  const request = new NextRequest(`https://vendor.test${path}`, { headers: routeHeaders, method });
  if (field) {
    const form = new FormData();
    form.append(field, new File(["image"], "product.webp", { type: "image/webp" }));
    vi.spyOn(request, "formData").mockResolvedValue(form);
  }
  return request;
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  api.DELETE.mockReset().mockResolvedValue({ data: mediaResponse });
  api.POST.mockReset().mockResolvedValue({ data: mediaResponse });
  api.PUT.mockReset().mockResolvedValue({ data: mediaResponse });
  vi.unstubAllGlobals();
});

describe("vendor product media BFF routes", () => {
  it("uses the generated multipart client contract for uploads", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(envelope(vendor));
    vi.stubGlobal("fetch", fetch);

    const response = await POST(
      mutationRequest(`/api/products/${productId}/media`, "POST", "images"),
      { params: Promise.resolve({ id: productId }) },
    );

    expect(api.POST, await response.clone().text()).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(201);
    expect(api.POST).toHaveBeenCalledWith(
      "/products/{id}/media",
      expect.objectContaining({
        body: { images: [expect.objectContaining({ name: "product.webp", type: "image/webp" })] },
        bodySerializer: expect.any(Function),
        params: { path: { id: productId } },
      }),
    );
  });

  it("forwards typed replacement and removal mutations", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope(vendor))
      .mockResolvedValueOnce(envelope(vendor));
    vi.stubGlobal("fetch", fetch);
    const params = { params: Promise.resolve({ id: productId, mediaId }) };

    const replaceResponse = await PUT(
      mutationRequest(`/api/products/${productId}/media/${mediaId}`, "PUT", "image"),
      params,
    );
    expect(api.PUT, await replaceResponse.clone().text()).toHaveBeenCalledTimes(1);
    expect(replaceResponse.status).toBe(200);
    expect(
      (
        await DELETE(
          mutationRequest(`/api/products/${productId}/media/${mediaId}`, "DELETE"),
          params,
        )
      ).status,
    ).toBe(200);
    expect(api.PUT).toHaveBeenCalledWith(
      "/products/{id}/media/{mediaId}",
      expect.objectContaining({ params: { path: { id: productId, mediaId } } }),
    );
    expect(api.DELETE).toHaveBeenCalledWith("/products/{id}/media/{mediaId}", {
      params: { path: { id: productId, mediaId } },
    });
  });
});

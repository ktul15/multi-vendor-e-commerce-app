import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "../app/api/products/[id]/route";

const productId = "11111111-1111-4111-8111-111111111111";
const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

function request(csrf = true) {
  return new NextRequest(`https://vendor.test/api/products/${productId}`, {
    headers: {
      Cookie: `vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token`,
      Origin: "https://vendor.test",
      "Sec-Fetch-Site": "same-origin",
      ...(csrf ? { "X-CSRF-Token": "csrf-token" } : {}),
      "X-Real-IP": "203.0.113.10",
    },
    method: "DELETE",
  });
}

const params = { params: Promise.resolve({ id: productId }) };
const envelope = (data: unknown, status = 200) =>
  Response.json(
    status < 400
      ? { data, message: "Product deleted successfully", success: true }
      : { message: String(data), success: false },
    { status },
  );

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

describe("vendor product BFF routes", () => {
  it("rejects delete requests without valid CSRF before calling the backend", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await DELETE(request(false), params);

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("verifies the vendor session and forwards an authorized delete", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope(vendor))
      .mockResolvedValueOnce(envelope(null));
    vi.stubGlobal("fetch", fetch);

    const response = await DELETE(request(), params);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[0]).toBe(`https://api.test/api/v1/products/${productId}`);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer access" },
      method: "DELETE",
    });
  });

  it.each([
    ["You do not have permission to modify this product", 403],
    ["Product cannot be deleted because it has order history", 409],
  ] as const)("preserves the backend %s error at status %i", async (message, status) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope(vendor))
      .mockResolvedValueOnce(envelope(message, status));
    vi.stubGlobal("fetch", fetch);

    const response = await DELETE(request(), params);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ message });
  });
});

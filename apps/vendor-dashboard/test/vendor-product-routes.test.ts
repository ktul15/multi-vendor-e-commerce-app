import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/products/route";
import { DELETE, PUT } from "../app/api/products/[id]/route";

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

const productValues = {
  basePrice: 25,
  categoryId: "22222222-2222-4222-8222-222222222222",
  description: "A complete product description.",
  images: ["https://images.test/product.jpg"],
  isActive: true,
  name: "Test product",
  tags: ["test"],
  variants: [{ color: "Black", price: 25, size: "M", sku: "TEST-M", stock: 4 }],
};

function mutationRequest(path: string, method: "POST" | "PUT", body = productValues) {
  return new NextRequest(`https://vendor.test${path}`, {
    body: JSON.stringify(body),
    headers: {
      Cookie:
        "vendor_access_token=access; vendor_refresh_token=refresh; vendor_session_id=session-1; vendor_csrf_token=csrf-token",
      "Content-Type": "application/json",
      Origin: "https://vendor.test",
      "Sec-Fetch-Site": "same-origin",
      "X-CSRF-Token": "csrf-token",
      "X-Real-IP": "203.0.113.10",
    },
    method,
  });
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

describe("vendor product BFF routes", () => {
  it("validates and forwards a complete create payload", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope(vendor))
      .mockResolvedValueOnce(envelope({ id: productId }, 201));
    vi.stubGlobal("fetch", fetch);

    const response = await POST(mutationRequest("/api/products", "POST"));

    expect(response.status).toBe(201);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/products");
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual(productValues);
  });

  it("forwards the complete edit to the atomic backend endpoint", async () => {
    const keptId = "33333333-3333-4333-8333-333333333333";
    const edited = {
      ...productValues,
      variants: [
        { color: "Black", id: keptId, price: 25, size: "M", sku: "TEST-M", stock: 8 },
        { color: "Blue", price: 30, size: "L", sku: "TEST-L", stock: 2 },
      ],
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(envelope(vendor))
      .mockResolvedValueOnce(envelope({ id: productId }));
    vi.stubGlobal("fetch", fetch);

    const response = await PUT(
      mutationRequest(`/api/products/${productId}`, "PUT", edited),
      params,
    );

    expect(response.status).toBe(200);
    expect(fetch.mock.calls.slice(1).map(([url, init]) => [url, init?.method])).toEqual([
      [`https://api.test/api/v1/products/${productId}/editor`, "PUT"],
    ]);
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual(edited);
  });

  it("returns field validation errors before resolving a session", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await POST(
      mutationRequest("/api/products", "POST", { ...productValues, description: "short" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: "Validation failed" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      [
        { color: "Blue", price: 25, size: "M", sku: "DUPLICATE", stock: 2 },
        { color: "Red", price: 25, size: "L", sku: "duplicate", stock: 3 },
      ],
      "SKU values must be unique within a product",
    ],
    [
      [
        { color: "Blue", price: 25, size: "M", sku: "BLUE-M-1", stock: 2 },
        { color: "blue", price: 30, size: "m", sku: "BLUE-M-2", stock: 3 },
      ],
      "Size and color combinations must be unique",
    ],
  ])("rejects unsafe variant payloads before resolving a session", async (variants, message) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await POST(
      mutationRequest("/api/products", "POST", { ...productValues, variants }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      errors: expect.arrayContaining([expect.objectContaining({ message })]),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

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

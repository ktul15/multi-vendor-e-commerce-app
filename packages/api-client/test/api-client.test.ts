import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { components } from "../src";
import {
  createAuthenticatedFetch,
  createApiClient,
  createCsrfFetch,
  normalizeApiError,
  serializeMultipartBody,
  unwrapApiResponse,
} from "../src";

describe("createApiClient", () => {
  it("includes cookie credentials and serializes typed query parameters", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ success: true, message: "ok", data: [] }));
    const client = createApiClient({
      baseUrl: "https://api.example.test/api/v1/",
      fetch: fetchMock,
    });

    await client.GET("/products", { params: { query: { page: 2, search: "phone" } } });

    const request = fetchMock.mock.calls[0]?.[0] as Request | undefined;
    expect(request?.credentials).toBe("include");
    expect(request?.url).toBe("https://api.example.test/api/v1/products?page=2&search=phone");
  });

  it("attaches bearer tokens only to the configured API origin", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    const authenticatedFetch = createAuthenticatedFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getAccessToken: () => "access-token",
    });

    await authenticatedFetch("https://api.example.test/api/v1/products");
    await authenticatedFetch("https://uploads.example.test/file");

    const trustedRequest = fetchMock.mock.calls[0]?.[0] as Request;
    const foreignRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(trustedRequest.headers.get("Authorization")).toBe("Bearer access-token");
    expect(foreignRequest.headers.has("Authorization")).toBe(false);
  });

  it("attaches CSRF tokens only to unsafe requests on the configured API origin", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    const csrfFetch = createCsrfFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getCsrfToken: () => "csrf-token",
    });

    await csrfFetch("https://api.example.test/api/v1/products", { method: "POST" });
    await csrfFetch("https://api.example.test/api/v1/products");
    await csrfFetch("https://uploads.example.test/file", { method: "POST" });

    const mutation = fetchMock.mock.calls[0]?.[0] as Request;
    const query = fetchMock.mock.calls[1]?.[0] as Request;
    const foreignMutation = fetchMock.mock.calls[2]?.[0] as Request;
    expect(mutation.headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(query.headers.has("X-CSRF-Token")).toBe(false);
    expect(foreignMutation.headers.has("X-CSRF-Token")).toBe(false);
  });

  it("retains a CORS-exposed CSRF token for the next unsafe request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ success: true }, { headers: { "X-CSRF-Token": "rotated-token" } }),
      )
      .mockResolvedValueOnce(Response.json({ success: true }));
    const csrfFetch = createCsrfFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getCsrfToken: () => null,
    });

    await csrfFetch("https://api.example.test/api/v1/profile");
    await csrfFetch("https://api.example.test/api/v1/products", { method: "POST" });

    const mutation = fetchMock.mock.calls[1]?.[0] as Request;
    expect(mutation.headers.get("X-CSRF-Token")).toBe("rotated-token");
  });

  it("prefers a newly rotated readable cookie over its cached token", async () => {
    let cookieToken: string | null = null;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ success: true }, { headers: { "X-CSRF-Token": "old-token" } }),
      )
      .mockResolvedValueOnce(Response.json({ success: true }));
    const csrfFetch = createCsrfFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getCsrfToken: () => cookieToken,
    });

    await csrfFetch("https://api.example.test/api/v1/profile");
    cookieToken = "new-token";
    await csrfFetch("https://api.example.test/api/v1/products", { method: "POST" });

    const mutation = fetchMock.mock.calls[1]?.[0] as Request;
    expect(mutation.headers.get("X-CSRF-Token")).toBe("new-token");
  });

  it("retries once when a cross-host cookie rotated in another client", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ success: true }, { headers: { "X-CSRF-Token": "old-token" } }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { success: false, message: "Invalid CSRF token" },
          {
            status: 403,
            headers: {
              "X-CSRF-Error": "token-mismatch",
              "X-CSRF-Token": "new-token",
            },
          },
        ),
      )
      .mockResolvedValueOnce(Response.json({ success: true }));
    const csrfFetch = createCsrfFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getCsrfToken: () => null,
    });

    await csrfFetch("https://api.example.test/api/v1/profile");
    const response = await csrfFetch("https://api.example.test/api/v1/products", {
      method: "POST",
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retriedMutation = fetchMock.mock.calls[2]?.[0] as Request;
    expect(retriedMutation.headers.get("X-CSRF-Token")).toBe("new-token");
  });

  it("does not retry a non-CSRF 403 when the exposed token changed", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ success: true }, { headers: { "X-CSRF-Token": "old-token" } }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { success: false, message: "Forbidden" },
          { status: 403, headers: { "X-CSRF-Token": "new-token" } },
        ),
      );
    const csrfFetch = createCsrfFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getCsrfToken: () => null,
    });

    await csrfFetch("https://api.example.test/api/v1/profile");
    const response = await csrfFetch("https://api.example.test/api/v1/products", {
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not attach or rotate CSRF tokens for bearer requests", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        { success: false, message: "Forbidden" },
        {
          status: 403,
          headers: {
            "X-CSRF-Error": "token-mismatch",
            "X-CSRF-Token": "new-token",
          },
        },
      ),
    );
    const csrfFetch = createCsrfFetch({
      apiOrigin: "https://api.example.test/api/v1",
      fetch: fetchMock,
      getCsrfToken: () => "old-token",
    });

    await csrfFetch("https://api.example.test/api/v1/products", {
      method: "POST",
      headers: { Authorization: "Bearer access-token" },
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.has("X-CSRF-Token")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes field errors from unsuccessful API responses", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.test/api/v1",
      fetch: vi.fn(async () =>
        Response.json(
          {
            success: false,
            message: "Validation failed",
            errors: [{ field: "phone", message: "Phone is too long" }],
          },
          { status: 400 },
        ),
      ),
    });

    await expect(client.GET("/products")).rejects.toMatchObject({
      fieldErrors: [{ field: "phone", message: "Phone is too long" }],
      message: "Validation failed",
      status: 400,
    });
  });

  it("passes AbortSignal through to fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const request = input as Request;
      expect(request.signal.aborted).toBe(true);
      throw new DOMException("aborted", "AbortError");
    });
    const controller = new AbortController();
    controller.abort();
    const client = createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock });

    await expect(client.GET("/products", { signal: controller.signal })).rejects.toMatchObject({
      message: "Request cancelled",
      status: 0,
    });
  });
});

describe("shared response helpers", () => {
  it("unwraps successful API envelopes", () => {
    expect(unwrapApiResponse({ success: true, message: "ok", data: { id: "product-1" } })).toEqual({
      id: "product-1",
    });
  });

  it("infers concrete data from generated success envelopes", () => {
    const response: components["schemas"]["AdminDashboardSuccess"] = {
      success: true,
      message: "ok",
      data: {
        totalUsers: 10,
        bannedUsers: 1,
        totalVendors: 2,
        pendingVendors: 1,
        totalProducts: 20,
        totalOrders: 30,
        platformRevenue: "1250.00",
      },
    };

    const data = unwrapApiResponse(response);
    expectTypeOf(data.platformRevenue).toEqualTypeOf<string>();
    expect(data.totalOrders).toBe(30);
  });

  it("normalizes generated fallback envelopes without claiming a data shape", () => {
    const response: components["schemas"]["ApiSuccess"] = {
      success: true,
      message: "ok",
      data: ["shape pending documentation"],
    };

    const data = unwrapApiResponse(response);
    expectTypeOf(data).toBeUnknown();
    expect(data).toEqual(["shape pending documentation"]);
  });

  it("matches product inventory and serialized decimal contracts", () => {
    type Product = components["schemas"]["ProductSummary"];
    type Variant = components["schemas"]["ProductVariant"];

    expectTypeOf<Product["basePrice"]>().toEqualTypeOf<string>();
    expectTypeOf<Product["avgRating"]>().toEqualTypeOf<string>();
    expectTypeOf<Product["variants"]>().toEqualTypeOf<readonly Variant[]>();
    expectTypeOf<Variant["price"]>().toEqualTypeOf<string>();
  });

  it("creates multipart bodies without forcing a JSON content type", () => {
    const image = new Blob(["image"], { type: "image/png" });
    const body = serializeMultipartBody({ image, position: 2, tags: ["sale", "home"] });

    expect(body.get("image")).toBeInstanceOf(Blob);
    expect((body.get("image") as Blob).type).toBe("image/png");
    expect(body.get("position")).toBe("2");
    expect(body.getAll("tags")).toEqual(["sale", "home"]);
  });

  it("performs a generated typed multipart request with a Blob", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { success: true, message: "created", data: { id: "banner-1" } },
          { status: 201 },
        ),
      );
    const client = createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock });

    await client.POST("/banners", {
      body: { image: new Blob(["image"], { type: "image/png" }), title: "Sale" },
      bodySerializer: serializeMultipartBody,
    });

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.body).not.toBeNull();
    expect(request.headers.get("content-type")).toContain("multipart/form-data; boundary=");
  });

  it("normalizes unknown errors into a stable general error", () => {
    expect(normalizeApiError(new Error("Network unavailable"))).toEqual(
      expect.objectContaining({ message: "Network unavailable", status: 0 }),
    );
  });
});

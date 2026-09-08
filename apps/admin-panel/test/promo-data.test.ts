import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "admin-token" }) })),
}));

const api = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@repo/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/api-client")>();
  return { ...actual, createApiClient: () => api };
});

import { getAdminPromo, getAdminPromos, PromoDataError } from "../src/lib/promo-data";

beforeEach(() => {
  api.GET.mockReset();
  process.env.API_BASE_URL = "https://api.test/api/v1";
});

describe("promo data", () => {
  it("loads filtered lists and direct promo details", async () => {
    const list = { items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } };
    api.GET.mockResolvedValueOnce({ data: { data: list } });
    await expect(
      getAdminPromos({ discountType: "FIXED", page: 1, pageSize: 20, search: "SAVE" }),
    ).resolves.toBe(list);
    expect(api.GET).toHaveBeenCalledWith("/promo-codes", {
      params: {
        query: {
          discountType: "FIXED",
          isActive: undefined,
          limit: 20,
          page: 1,
          search: "SAVE",
        },
      },
    });
    const detail = { code: "SAVE20", id: "promo-1" };
    api.GET.mockResolvedValueOnce({ data: { data: detail } });
    await expect(getAdminPromo("promo-1")).resolves.toBe(detail);
    expect(api.GET).toHaveBeenLastCalledWith("/promo-codes/{id}", {
      params: { path: { id: "promo-1" } },
    });
  });

  it("normalizes missing and empty responses", async () => {
    api.GET.mockResolvedValue({});
    await expect(getAdminPromos({ page: 1, pageSize: 20, search: "" })).rejects.toBeInstanceOf(
      PromoDataError,
    );
  });
});

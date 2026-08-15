import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "admin-token" }) })),
}));
const api = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@repo/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/api-client")>()),
  createApiClient: () => api,
}));
import { BannerDataError, getAdminBanner, getAdminBanners } from "../src/lib/banner-data";

beforeEach(() => {
  api.GET.mockReset();
  process.env.API_BASE_URL = "https://api.test/api/v1";
});
describe("banner data", () => {
  it("loads ordered list queries and detail routes", async () => {
    const list = { items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } };
    api.GET.mockResolvedValueOnce({ data: { data: list } });
    await expect(getAdminBanners({ isActive: false, page: 1, pageSize: 20 })).resolves.toBe(list);
    expect(api.GET).toHaveBeenCalledWith("/banners/all", {
      params: { query: { isActive: false, limit: 20, page: 1 } },
    });
    const banner = { id: "banner-1", title: "Sale" };
    api.GET.mockResolvedValueOnce({ data: { data: banner } });
    await expect(getAdminBanner("banner-1")).resolves.toBe(banner);
    expect(api.GET).toHaveBeenLastCalledWith("/banners/{id}", {
      params: { path: { id: "banner-1" } },
    });
  });
  it("normalizes empty responses", async () => {
    api.GET.mockResolvedValue({});
    await expect(getAdminBanners({ page: 1, pageSize: 20 })).rejects.toBeInstanceOf(
      BannerDataError,
    );
  });
});

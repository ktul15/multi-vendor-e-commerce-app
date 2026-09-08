import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const api = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@repo/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/api-client")>();
  return { ...actual, createApiClient: () => api };
});

import { CategoryDataError, getAdminCategories } from "../src/lib/category-data";

beforeEach(() => {
  api.GET.mockReset();
  process.env.API_BASE_URL = "https://api.test/api/v1";
});

describe("category data", () => {
  it("loads the complete category tree", async () => {
    const tree = [{ children: [], id: "category-1", name: "Electronics" }];
    api.GET.mockResolvedValue({ data: { data: tree, message: "ok", success: true } });
    await expect(getAdminCategories()).resolves.toBe(tree);
    expect(api.GET).toHaveBeenCalledWith("/categories");
  });

  it("normalizes missing configuration and empty responses", async () => {
    delete process.env.API_BASE_URL;
    await expect(getAdminCategories()).rejects.toMatchObject({
      message: "Category service is unavailable",
      status: 503,
    });
    process.env.API_BASE_URL = "https://api.test/api/v1";
    api.GET.mockResolvedValue({});
    await expect(getAdminCategories()).rejects.toBeInstanceOf(CategoryDataError);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminUser, getAdminUsers, UserDataError } from "../src/lib/user-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "admin-access-token" }) }),
}));

function envelope(data: unknown, status = 200, message = "ok") {
  return Response.json(
    status < 400 ? { data, message, success: true } : { message, success: false },
    { status },
  );
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  vi.unstubAllGlobals();
});

describe("admin user data", () => {
  it("passes server pagination, search, and filters to the list endpoint", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      expect(request.headers.get("Authorization")).toBe("Bearer admin-access-token");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("limit")).toBe("50");
      expect(url.searchParams.get("role")).toBe("VENDOR");
      expect(url.searchParams.get("isBanned")).toBe("true");
      expect(url.searchParams.get("search")).toBe("asha");
      return envelope({ items: [], meta: { limit: 50, page: 2, total: 0, totalPages: 1 } });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(
      getAdminUsers({
        accountStatus: "banned",
        page: 2,
        pageSize: 50,
        role: "VENDOR",
        search: "asha",
      }),
    ).resolves.toMatchObject({ items: [] });
  });

  it("preserves not-found status from a detail request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelope(null, 404, "User not found")),
    );

    await expect(getAdminUser("11111111-1111-4111-8111-111111111111")).rejects.toEqual(
      expect.objectContaining<UserDataError>({
        message: "User not found",
        name: "UserDataError",
        status: 404,
      }),
    );
  });
});

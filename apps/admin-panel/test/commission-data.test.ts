import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommissionDataError, getDefaultCommission } from "../src/lib/commission-data";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "admin-access-token" }) }),
}));

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  vi.unstubAllGlobals();
});

describe("admin commission data", () => {
  it("loads the current rate and source with the admin access token", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const request = input as Request;
      expect(request.url).toBe("https://api.test/api/v1/admin/commission");
      expect(request.headers.get("Authorization")).toBe("Bearer admin-access-token");
      return Response.json({
        data: { rate: 10, source: "database" },
        message: "Default commission fetched",
        success: true,
      });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(getDefaultCommission()).resolves.toEqual({ rate: 10, source: "database" });
  });

  it("preserves backend failures for retryable error rendering", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { message: "Commission settings unavailable", success: false },
          { status: 503 },
        ),
      ),
    );

    await expect(getDefaultCommission()).rejects.toEqual(
      expect.objectContaining<CommissionDataError>({
        message: "Commission settings unavailable",
        name: "CommissionDataError",
        status: 503,
      }),
    );
  });
});

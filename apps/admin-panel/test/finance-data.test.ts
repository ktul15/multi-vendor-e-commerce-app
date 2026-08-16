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
import { getAdminFinanceData } from "../src/lib/finance-data";

const state = {
  endDate: "2026-08-16T00:00:00.000Z",
  endInput: "2026-08-15",
  period: "day" as const,
  range: "30d" as const,
  startDate: "2026-07-17T00:00:00.000Z",
  startInput: "2026-07-17",
};
beforeEach(() => {
  api.GET.mockReset();
  process.env.API_BASE_URL = "https://api.test/api/v1";
});
describe("finance data", () => {
  it("requests backend-filtered report and commission independently", async () => {
    const report = { totals: { grossRevenue: "100.00" } };
    api.GET.mockResolvedValueOnce({ data: { data: report } }).mockResolvedValueOnce({
      data: { data: { rate: 10, source: "database" } },
    });
    const data = await getAdminFinanceData(state);
    expect(data.report).toEqual({ data: report, status: "success" });
    expect(api.GET).toHaveBeenNthCalledWith(1, "/admin/revenue", {
      params: { query: { endDate: state.endDate, period: "day", startDate: state.startDate } },
    });
  });
  it("preserves partial failures", async () => {
    api.GET.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      data: { data: { rate: 10 } },
    });
    const data = await getAdminFinanceData(state);
    expect(data.report.status).toBe("error");
    expect(data.commission.status).toBe("success");
  });
});

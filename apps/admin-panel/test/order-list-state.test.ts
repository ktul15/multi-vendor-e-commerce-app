import { describe, expect, it } from "vitest";
import { orderListHref, orderListQuery, parseOrderListState } from "../src/lib/order-list-state";

const customerId = "11111111-1111-4111-8111-111111111111";
const vendorId = "22222222-2222-4222-8222-222222222222";

describe("admin order list state", () => {
  it("normalizes pagination, search, status, identities, and date filters", () => {
    const state = parseOrderListState({
      "filter.endDate": "2026-08-14",
      "filter.startDate": "2026-08-01",
      "filter.status": "PROCESSING",
      "filter.userId": customerId,
      "filter.vendorId": vendorId,
      page: "3",
      pageSize: "50",
      search: " ORD-123 ",
    });
    expect(state).toEqual({
      endDate: "2026-08-14",
      page: 3,
      pageSize: 50,
      search: "ORD-123",
      startDate: "2026-08-01",
      status: "PROCESSING",
      userId: customerId,
      vendorId,
    });
    expect(orderListQuery(state)).toEqual({
      endDate: "2026-08-14T23:59:59.999Z",
      limit: 50,
      page: 3,
      search: "ORD-123",
      startDate: "2026-08-01T00:00:00.000Z",
      status: "PROCESSING",
      userId: customerId,
      vendorId,
    });
    expect(orderListHref(state, { page: 2 })).toContain("filter.status=PROCESSING");
  });

  it("drops invalid filters, dates, and unsafe pagination", () => {
    expect(
      parseOrderListState({
        "filter.endDate": "2026-02-31",
        "filter.status": "MIXED",
        "filter.userId": "invalid",
        page: "-1",
        pageSize: "500",
      }),
    ).toEqual({
      endDate: undefined,
      page: 1,
      pageSize: 20,
      search: "",
      startDate: undefined,
      status: undefined,
      userId: undefined,
      vendorId: undefined,
    });
  });
});

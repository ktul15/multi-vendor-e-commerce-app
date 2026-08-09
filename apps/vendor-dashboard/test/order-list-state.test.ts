import { describe, expect, it } from "vitest";
import { orderListHref, orderListQuery, parseOrderListState } from "../src/lib/order-list-state";

describe("order list state", () => {
  it("normalizes server pagination, search, and status filters", () => {
    const state = parseOrderListState({
      "filter.status": "SHIPPED",
      page: "3",
      pageSize: "25",
      search: " ORD-42 ",
    });
    expect(state).toEqual({ page: 3, pageSize: 25, search: "ORD-42", status: "SHIPPED" });
    expect(orderListQuery(state)).toEqual({
      limit: 25,
      page: 3,
      search: "ORD-42",
      status: "SHIPPED",
    });
    expect(orderListHref(state, { page: 2 })).toContain("filter.status=SHIPPED");
  });

  it("drops invalid filters and bounds unsafe pagination", () => {
    expect(
      parseOrderListState({ "filter.status": "UNKNOWN", page: "-2", pageSize: "500" }),
    ).toEqual({ page: 1, pageSize: 10, search: "", status: undefined });
  });
});

import { describe, expect, it } from "vitest";
import {
  parseVendorListState,
  vendorListHref,
  vendorListQuery,
} from "../src/lib/vendor-list-state";

describe("admin vendor list state", () => {
  it("normalizes pagination, search, and status from the URL", () => {
    const state = parseVendorListState({
      "filter.status": "SUSPENDED",
      page: "3",
      pageSize: "50",
      search: " owner@example.test ",
    });
    expect(state).toEqual({
      page: 3,
      pageSize: 50,
      search: "owner@example.test",
      status: "SUSPENDED",
    });
    expect(vendorListQuery(state)).toEqual({
      limit: 50,
      page: 3,
      search: "owner@example.test",
      status: "SUSPENDED",
    });
    expect(vendorListHref(state, { page: 2 })).toContain("filter.status=SUSPENDED");
  });

  it("drops invalid filters and unsafe pagination", () => {
    expect(
      parseVendorListState({ "filter.status": "ARCHIVED", page: "-1", pageSize: "500" }),
    ).toEqual({ page: 1, pageSize: 20, search: "", status: undefined });
  });
});

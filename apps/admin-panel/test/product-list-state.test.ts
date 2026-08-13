import { describe, expect, it } from "vitest";
import {
  parseProductListState,
  productListHref,
  productListQuery,
} from "../src/lib/product-list-state";

const vendorId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";

describe("admin product list state", () => {
  it("normalizes pagination, search, status, vendor, and category URL filters", () => {
    const state = parseProductListState({
      "filter.categoryId": categoryId,
      "filter.status": "inactive",
      "filter.vendorId": vendorId,
      page: "3",
      pageSize: "50",
      search: " linen shirt ",
    });
    expect(state).toEqual({
      categoryId,
      page: 3,
      pageSize: 50,
      search: "linen shirt",
      status: "inactive",
      vendorId,
    });
    expect(productListQuery(state)).toEqual({
      categoryId,
      isActive: false,
      limit: 50,
      page: 3,
      search: "linen shirt",
      vendorId,
    });
    expect(productListHref(state, { page: 2 })).toContain("filter.status=inactive");
  });

  it("drops invalid filters and unsafe pagination", () => {
    expect(
      parseProductListState({
        "filter.categoryId": "invalid",
        "filter.status": "archived",
        "filter.vendorId": "invalid",
        page: "-1",
        pageSize: "500",
      }),
    ).toEqual({
      categoryId: undefined,
      page: 1,
      pageSize: 20,
      search: "",
      status: undefined,
      vendorId: undefined,
    });
  });
});

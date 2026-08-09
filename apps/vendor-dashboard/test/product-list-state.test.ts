import { describe, expect, it } from "vitest";
import {
  parseProductListState,
  productInventoryQuery,
  productListHref,
} from "../src/lib/product-list-state";

describe("product list URL state", () => {
  it("parses pagination, search, filters, and sorting from URL parameters", () => {
    const state = parseProductListState({
      direction: "asc",
      "filter.inStock": "false",
      "filter.isActive": "true",
      page: "3",
      pageSize: "25",
      search: "  headset  ",
      sort: "basePrice",
    });

    expect(state).toEqual({
      inStock: false,
      isActive: true,
      page: 3,
      pageSize: 25,
      search: "headset",
      sortBy: "basePrice",
      sortOrder: "asc",
    });
    expect(productInventoryQuery(state)).toEqual({
      inStock: false,
      isActive: true,
      limit: 25,
      page: 3,
      search: "headset",
      sortBy: "basePrice",
      sortOrder: "asc",
    });
  });

  it("falls back safely for invalid URL values", () => {
    expect(
      parseProductListState({
        direction: "sideways",
        "filter.inStock": "sometimes",
        page: "-1",
        pageSize: "100",
        sort: "password",
      }),
    ).toEqual({
      inStock: undefined,
      isActive: undefined,
      page: 1,
      pageSize: 10,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("serializes complete state so filters survive refresh and navigation", () => {
    expect(
      productListHref({
        inStock: true,
        isActive: false,
        page: 2,
        pageSize: 50,
        search: "phone",
        sortBy: "name",
        sortOrder: "asc",
      }),
    ).toBe(
      "/products?direction=asc&filter.inStock=true&filter.isActive=false&page=2&pageSize=50&search=phone&sort=name",
    );
  });
});

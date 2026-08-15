import { describe, expect, it } from "vitest";
import { parsePromoListState, promoListHref, promoListQuery } from "../src/lib/promo-list-state";

describe("promo list state", () => {
  it("parses supported URL filters and normalizes invalid values", () => {
    expect(
      parsePromoListState({
        "filter.discountType": "PERCENTAGE",
        "filter.isActive": "false",
        page: "3",
        pageSize: "50",
        search: " summer ",
      }),
    ).toEqual({
      discountType: "PERCENTAGE",
      isActive: false,
      page: 3,
      pageSize: 50,
      search: "summer",
    });
    expect(
      parsePromoListState({ "filter.discountType": "INVALID", "filter.isActive": "maybe" }),
    ).toEqual({ page: 1, pageSize: 20, search: "" });
  });

  it("creates stable navigation and API query values", () => {
    const state = {
      discountType: "FIXED" as const,
      isActive: true,
      page: 2,
      pageSize: 20,
      search: "SAVE",
    };
    expect(promoListHref(state, { page: 3 })).toBe(
      "/promos?filter.discountType=FIXED&filter.isActive=true&page=3&pageSize=20&search=SAVE&sort=createdAt",
    );
    expect(promoListQuery(state)).toEqual({
      discountType: "FIXED",
      isActive: true,
      limit: 20,
      page: 2,
      search: "SAVE",
    });
  });
});

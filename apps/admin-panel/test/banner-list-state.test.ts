import { describe, expect, it } from "vitest";
import {
  bannerListHref,
  bannerListQuery,
  parseBannerListState,
} from "../src/lib/banner-list-state";

describe("banner list state", () => {
  it("parses bounded pagination and backend activation filters", () => {
    expect(parseBannerListState({ "filter.isActive": "false", page: "3", pageSize: "50" })).toEqual(
      { isActive: false, page: 3, pageSize: 50 },
    );
    expect(
      parseBannerListState({ "filter.isActive": "scheduled", page: "bad", pageSize: "500" }),
    ).toEqual({ isActive: undefined, page: 1, pageSize: 20 });
  });
  it("serializes stable list links and API queries", () => {
    const state = { isActive: true, page: 2, pageSize: 10 } as const;
    expect(bannerListHref(state, { page: 1 })).toBe(
      "/banners?filter.isActive=true&page=1&pageSize=10&sort=position",
    );
    expect(bannerListQuery(state)).toEqual({ isActive: true, limit: 10, page: 2 });
  });
});

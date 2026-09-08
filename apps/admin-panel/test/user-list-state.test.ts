import { describe, expect, it } from "vitest";
import { parseUserListState, userListHref, userListQuery } from "../src/lib/user-list-state";

describe("admin user list state", () => {
  it("normalizes pagination, search, role, and account state from the URL", () => {
    const state = parseUserListState({
      "filter.role": "VENDOR",
      "filter.status": "banned",
      page: "3",
      pageSize: "50",
      search: " vendor@example.test ",
    });

    expect(state).toEqual({
      accountStatus: "banned",
      page: 3,
      pageSize: 50,
      role: "VENDOR",
      search: "vendor@example.test",
    });
    expect(userListQuery(state)).toEqual({
      isBanned: true,
      limit: 50,
      page: 3,
      role: "VENDOR",
      search: "vendor@example.test",
    });
    expect(userListHref(state, { page: 2 })).toContain("filter.role=VENDOR");
  });

  it("drops invalid filters and unsafe pagination", () => {
    expect(
      parseUserListState({
        "filter.role": "OWNER",
        "filter.status": "deleted",
        page: "-1",
        pageSize: "500",
      }),
    ).toEqual({
      accountStatus: undefined,
      page: 1,
      pageSize: 20,
      role: undefined,
      search: "",
    });
  });

  it("maps the active account filter to isBanned false", () => {
    expect(userListQuery(parseUserListState({ "filter.status": "active" })).isBanned).toBe(false);
  });
});

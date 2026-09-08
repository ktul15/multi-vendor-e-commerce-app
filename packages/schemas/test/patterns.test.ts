import { describe, expect, it, vi } from "vitest";
import {
  applyApiFieldErrors,
  optionalTrimmedString,
  parseTableUrlState,
  serializeTableUrlState,
} from "../src";

describe("form error conventions", () => {
  it("maps known API fields, focuses the first, and retains the form message", () => {
    const setError = vi.fn();
    const formError = applyApiFieldErrors({
      error: {
        fieldErrors: [
          { field: "sku", message: "SKU is already used" },
          { field: "unknown", message: "Ignored field" },
          { field: "name", message: "Name is required" },
        ],
        message: "Validation failed",
      },
      fields: ["name", "sku"] as const,
      setError,
    });

    expect(formError).toBe("Validation failed");
    expect(setError).toHaveBeenNthCalledWith(
      1,
      "sku",
      { message: "SKU is already used", type: "server" },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      "name",
      { message: "Name is required", type: "server" },
      { shouldFocus: false },
    );
  });

  it("normalizes an empty optional field to omission", () => {
    expect(optionalTrimmedString.parse("   ")).toBeUndefined();
    expect(optionalTrimmedString.parse(" value ")).toBe("value");
  });
});

describe("URL-backed table state", () => {
  const options = {
    filterKeys: ["status"],
    pageSizes: [10, 25, 50],
    sortFields: ["name", "createdAt"],
  } as const;

  it("translates one-based URLs into zero-based controlled table state", () => {
    const state = parseTableUrlState(
      new URLSearchParams(
        "page=3&pageSize=50&sort=createdAt&direction=desc&search=phone&filter.status=active",
      ),
      options,
    );

    expect(state).toEqual({
      columnFilters: [{ id: "status", value: "active" }],
      pagination: { pageIndex: 2, pageSize: 50 },
      search: "phone",
      sorting: [{ desc: true, id: "createdAt" }],
    });
    expect(serializeTableUrlState(state).get("page")).toBe("3");
  });

  it("canonicalizes invalid values to documented defaults", () => {
    expect(
      parseTableUrlState(
        new URLSearchParams("page=-2&pageSize=999&sort=password&search="),
        options,
      ),
    ).toEqual({
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: 25 },
      search: "",
      sorting: [],
    });
  });

  it("rejects page, search, and filter values beyond configured bounds", () => {
    expect(
      parseTableUrlState(new URLSearchParams("page=101&search=123456&filter.status=123456"), {
        ...options,
        maxFilterLength: 5,
        maxPage: 100,
        maxSearchLength: 5,
      }),
    ).toEqual({
      columnFilters: [],
      pagination: { pageIndex: 0, pageSize: 25 },
      search: "",
      sorting: [],
    });
  });
});

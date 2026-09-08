import { describe, expect, it } from "vitest";
import { createDashboardQueryClient, dashboardQueryDefaults, isRetryableQueryError } from "../src";
import { createServerQueryClient } from "../src/server";

describe("dashboard query defaults", () => {
  it("uses bounded read retries and never retries mutations", () => {
    expect(dashboardQueryDefaults.queries.retry(0, { status: 503 })).toBe(true);
    expect(dashboardQueryDefaults.queries.retry(1, { status: 0 })).toBe(true);
    expect(dashboardQueryDefaults.queries.retry(2, { status: 503 })).toBe(false);
    expect(dashboardQueryDefaults.queries.retry(0, { status: 409 })).toBe(false);
    expect(dashboardQueryDefaults.mutations.retry).toBe(false);
  });

  it("classifies only transient query failures as retryable", () => {
    expect(isRetryableQueryError({ status: 429 })).toBe(true);
    expect(isRetryableQueryError({ status: 500 })).toBe(true);
    expect(isRetryableQueryError({ status: 401 })).toBe(false);
    expect(isRetryableQueryError({ status: 404 })).toBe(false);
  });

  it("creates isolated clients for browser mounts and server requests", () => {
    expect(createDashboardQueryClient()).not.toBe(createDashboardQueryClient());
    expect(createServerQueryClient()).not.toBe(createServerQueryClient());
  });
});

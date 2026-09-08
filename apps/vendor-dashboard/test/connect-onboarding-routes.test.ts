import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as onboard } from "../app/api/connect/onboard/route";
import { GET as refresh } from "../app/(protected)/stripe/refresh/route";
import { GET as reconcileReturn } from "../app/(protected)/stripe/return/route";

const vendor = {
  avatar: null,
  email: "vendor@example.test",
  id: "vendor-1",
  name: "Vendor",
  role: "VENDOR",
};

function request(path: string, options?: Readonly<{ csrf?: boolean; refreshGuard?: boolean }>) {
  return new NextRequest(`https://vendor.test${path}`, {
    headers: {
      Cookie: [
        "vendor_access_token=access",
        "vendor_refresh_token=refresh",
        "vendor_session_id=session-1",
        "vendor_csrf_token=csrf-token",
        ...(options?.refreshGuard ? ["vendor_connect_refresh_guard=guard"] : []),
      ].join("; "),
      Origin: "https://vendor.test",
      "Sec-Fetch-Site": "same-origin",
      ...(options?.csrf === false ? {} : { "X-CSRF-Token": "csrf-token" }),
      "X-Real-IP": "203.0.113.10",
    },
    method: path.startsWith("/api/") ? "POST" : "GET",
  });
}

function authenticatedFetch(connectResponse: Response) {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({ data: vendor, success: true }))
    .mockResolvedValueOnce(connectResponse);
}

beforeEach(() => {
  process.env.API_BASE_URL = "https://api.test/api/v1";
  process.env.DASHBOARD_BFF_SECRET = "test-dashboard-bff-secret-at-least-32-characters";
  process.env.DASHBOARD_TRUSTED_CLIENT_IP_HEADER = "x-real-ip";
  process.env.NEXT_PUBLIC_APP_URL = "https://vendor.test";
  vi.unstubAllGlobals();
});

describe("Stripe Connect browser routes", () => {
  it("requires vendor CSRF before starting onboarding", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    expect((await onboard(request("/api/connect/onboard", { csrf: false }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an authenticated non-vendor before calling Connect", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(
      Response.json({
        data: { ...vendor, role: "ADMIN" },
        success: true,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    expect((await onboard(request("/api/connect/onboard"))).status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("starts onboarding for the authenticated vendor and accepts only Stripe destinations", async () => {
    const fetch = authenticatedFetch(
      Response.json({
        data: { url: "https://connect.stripe.com/setup/s/test-link" },
        success: true,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await onboard(request("/api/connect/onboard"));

    expect(response.status).toBe(200);
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/vendor-payouts/connect/onboard");
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer access" },
      method: "POST",
      redirect: "error",
    });
    await expect(response.json()).resolves.toEqual({
      data: { provider: "STRIPE", url: "https://connect.stripe.com/setup/s/test-link" },
      success: true,
    });

    vi.stubGlobal(
      "fetch",
      authenticatedFetch(
        Response.json({ data: { url: "https://attacker.test/stripe" }, success: true }),
      ),
    );
    expect((await onboard(request("/api/connect/onboard"))).status).toBe(502);

    vi.stubGlobal(
      "fetch",
      authenticatedFetch(
        Response.json({
          data: { url: "https://user:password@connect.stripe.com/setup/s/test" },
          success: true,
        }),
      ),
    );
    expect((await onboard(request("/api/connect/onboard"))).status).toBe(502);
  });

  it("accepts a completed Razorpay sandbox onboarding response without an external redirect", async () => {
    vi.stubGlobal(
      "fetch",
      authenticatedFetch(
        Response.json({
          data: {
            accountId: "acc_mock_vendor",
            onboardingStatus: "COMPLETE",
            provider: "RAZORPAY",
            sandbox: true,
          },
          success: true,
        }),
      ),
    );

    await expect((await onboard(request("/api/connect/onboard"))).json()).resolves.toEqual({
      data: { completed: true, provider: "RAZORPAY" },
      success: true,
    });
  });

  it("refreshes a single-use link once and stops immediate replay loops", async () => {
    const fetch = authenticatedFetch(
      Response.json({
        data: { url: "https://connect.stripe.com/setup/s/refreshed" },
        success: true,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await refresh(request("/stripe/refresh"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://connect.stripe.com/setup/s/refreshed");
    expect(response.headers.get("set-cookie")).toContain("vendor_connect_refresh_guard=");
    expect(fetch.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/vendor-payouts/connect/onboard/refresh",
    );

    const replayFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: vendor, success: true }));
    vi.stubGlobal("fetch", replayFetch);
    const replay = await refresh(request("/stripe/refresh", { refreshGuard: true }));
    expect(replay.headers.get("location")).toBe(
      "https://vendor.test/earnings?connect=refresh-loop",
    );
    expect(replayFetch).toHaveBeenCalledTimes(1);
  });

  it("reconciles return state with the backend instead of trusting query parameters", async () => {
    const fetch = authenticatedFetch(
      Response.json({
        data: {
          chargesEnabled: true,
          detailsSubmitted: true,
          onboardingStatus: "COMPLETE",
          payoutsEnabled: true,
          provider: "STRIPE",
        },
        success: true,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await reconcileReturn(request("/stripe/return?complete=false"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://vendor.test/earnings?connect=returned");
    expect(fetch.mock.calls[1]?.[0]).toBe("https://api.test/api/v1/vendor-payouts/connect/status");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("returns to a recoverable dashboard state when reconciliation fails", async () => {
    vi.stubGlobal(
      "fetch",
      authenticatedFetch(
        Response.json({ message: "Stripe unavailable", success: false }, { status: 503 }),
      ),
    );

    const response = await reconcileReturn(request("/stripe/return?success=true"));

    expect(response.headers.get("location")).toBe(
      "https://vendor.test/earnings?connect=return-failed",
    );
  });

  it("does not accept a Razorpay status as proof of a Stripe return", async () => {
    vi.stubGlobal(
      "fetch",
      authenticatedFetch(
        Response.json({
          data: {
            chargesEnabled: true,
            detailsSubmitted: true,
            onboardingStatus: "COMPLETE",
            payoutsEnabled: true,
            provider: "RAZORPAY",
            sandbox: true,
          },
          success: true,
        }),
      ),
    );

    const response = await reconcileReturn(request("/stripe/return"));

    expect(response.headers.get("location")).toBe(
      "https://vendor.test/earnings?connect=return-failed",
    );
  });
});

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  connectStatusProvider,
  finalizeConnectResponse,
  requestConnectBackend,
  resolveConnectContext,
  vendorDashboardLocation,
} from "../../../../src/lib/connect-route";

const refreshGuardCookie = "vendor_connect_refresh_guard";

export async function GET(request: NextRequest) {
  const resolved = await resolveConnectContext(request);
  if ("response" in resolved) return resolved.response;

  const backend = await requestConnectBackend(
    resolved.context,
    "/vendor-payouts/connect/status",
    "GET",
  );
  const returnedFromStripe = backend.ok && connectStatusProvider(backend.payload) === "STRIPE";
  const destination = vendorDashboardLocation(
    returnedFromStripe ? "/earnings?connect=returned" : "/earnings?connect=return-failed",
  );
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(refreshGuardCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/stripe",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return finalizeConnectResponse(request, resolved.context.session, response);
}

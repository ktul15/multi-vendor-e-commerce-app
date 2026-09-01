import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  finalizeConnectResponse,
  requestConnectBackend,
  resolveConnectContext,
  stripeConnectLocation,
  vendorDashboardLocation,
} from "../../../../src/lib/connect-route";

const refreshGuardCookie = "vendor_connect_refresh_guard";

function earningsRedirect(outcome: string) {
  return NextResponse.redirect(
    vendorDashboardLocation(`/earnings?connect=${encodeURIComponent(outcome)}`),
    303,
  );
}

export async function GET(request: NextRequest) {
  const resolved = await resolveConnectContext(request);
  if ("response" in resolved) return resolved.response;
  if (request.cookies.has(refreshGuardCookie)) {
    return finalizeConnectResponse(
      request,
      resolved.context.session,
      earningsRedirect("refresh-loop"),
    );
  }

  const backend = await requestConnectBackend(
    resolved.context,
    "/vendor-payouts/connect/onboard/refresh",
    "GET",
  );
  if (!backend.ok) {
    return finalizeConnectResponse(
      request,
      resolved.context.session,
      earningsRedirect(backend.status === 400 ? "not-started" : "refresh-failed"),
    );
  }
  const destination = stripeConnectLocation(backend.payload);
  if (!destination) {
    return finalizeConnectResponse(
      request,
      resolved.context.session,
      earningsRedirect("invalid-destination"),
    );
  }

  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(refreshGuardCookie, crypto.randomUUID(), {
    httpOnly: true,
    maxAge: 15,
    path: "/stripe",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return finalizeConnectResponse(request, resolved.context.session, response);
}

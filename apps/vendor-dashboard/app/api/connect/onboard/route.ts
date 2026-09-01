import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  connectFailure,
  connectResponseMessage,
  finalizeConnectResponse,
  requestConnectBackend,
  razorpaySandboxCompleted,
  resolveConnectContext,
  stripeConnectLocation,
} from "../../../../src/lib/connect-route";
import { validMutation } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  if (!validMutation(request)) return connectFailure("Invalid CSRF or request origin", 403);
  const resolved = await resolveConnectContext(request);
  if ("response" in resolved) return resolved.response;

  const backend = await requestConnectBackend(
    resolved.context,
    "/vendor-payouts/connect/onboard",
    "POST",
  );
  if (!backend.ok) {
    return finalizeConnectResponse(
      request,
      resolved.context.session,
      connectFailure(
        connectResponseMessage(backend.payload, "Stripe Connect setup could not be started"),
        backend.status,
      ),
    );
  }
  const url = stripeConnectLocation(backend.payload);
  const razorpayCompleted = razorpaySandboxCompleted(backend.payload);
  return finalizeConnectResponse(
    request,
    resolved.context.session,
    url
      ? NextResponse.json({ data: { provider: "STRIPE", url }, success: true })
      : razorpayCompleted
        ? NextResponse.json({ data: { completed: true, provider: "RAZORPAY" }, success: true })
        : connectFailure("Payment provider returned an invalid onboarding response", 502),
  );
}

import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
} from "./session";

type AuthenticatedSession = Extract<
  Awaited<ReturnType<typeof resolveRequestSession>>,
  { kind: "authenticated" }
>;

export type ConnectContext = Readonly<{
  apiBase: string;
  request: NextRequest;
  session: AuthenticatedSession;
  token: string;
}>;

export type ConnectBackendResponse = Readonly<{
  ok: boolean;
  payload: unknown;
  status: number;
}>;

export function connectFailure(message: string, status: number) {
  return NextResponse.json({ message, success: false }, { status });
}

export function vendorDashboardLocation(path: string): URL {
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!appOrigin) throw new Error("NEXT_PUBLIC_APP_URL is required");
  const origin = new URL(appOrigin);
  if (origin.origin !== appOrigin || !["http:", "https:"].includes(origin.protocol)) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an exact HTTP(S) origin");
  }
  return new URL(path, origin);
}

export async function resolveConnectContext(
  request: NextRequest,
): Promise<{ context: ConnectContext } | { response: NextResponse }> {
  let session: Awaited<ReturnType<typeof resolveRequestSession>>;
  try {
    session = await resolveRequestSession(request);
  } catch {
    return { response: connectFailure("Session service unavailable", 503) };
  }
  if (session.kind === "unauthenticated") {
    return { response: connectFailure("Authentication required", 401) };
  }
  if (session.kind === "forbidden") {
    return { response: connectFailure("Vendor access required", 403) };
  }
  const token = session.rotatedTokens?.accessToken ?? requestCredentials(request).accessToken;
  const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!token || !apiBase) {
    return {
      response: finalizeConnectResponse(
        request,
        session,
        connectFailure("Stripe Connect service unavailable", 503),
      ),
    };
  }
  return { context: { apiBase, request, session, token } };
}

export function finalizeConnectResponse(
  request: NextRequest,
  session: AuthenticatedSession,
  response: NextResponse,
): NextResponse {
  if (session.rotatedTokens) {
    applyCookieWrites(response, rotateRequestSession(request, session.rotatedTokens));
  }
  return response;
}

export async function requestConnectBackend(
  context: ConnectContext,
  path:
    | "/vendor-payouts/connect/onboard"
    | "/vendor-payouts/connect/onboard/refresh"
    | "/vendor-payouts/connect/status",
  method: "GET" | "POST",
): Promise<ConnectBackendResponse> {
  try {
    const response = await fetch(`${context.apiBase}${path}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${context.token}` },
      method,
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    return {
      ok: response.ok,
      payload: await response.json().catch(() => undefined),
      status: response.status,
    };
  } catch {
    return { ok: false, payload: undefined, status: 503 };
  }
}

export function connectResponseMessage(payload: unknown, fallback: string): string {
  return typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : fallback;
}

export function stripeConnectLocation(payload: unknown): string | undefined {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    typeof payload.data !== "object" ||
    payload.data === null ||
    !("url" in payload.data) ||
    typeof payload.data.url !== "string"
  ) {
    return undefined;
  }
  try {
    const url = new URL(payload.data.url);
    return url.origin === "https://connect.stripe.com" && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function razorpaySandboxCompleted(payload: unknown): boolean {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    typeof payload.data !== "object" ||
    payload.data === null
  ) {
    return false;
  }
  const data = payload.data as Record<string, unknown>;
  return (
    data.provider === "RAZORPAY" &&
    data.onboardingStatus === "COMPLETE" &&
    data.sandbox === true &&
    typeof data.accountId === "string"
  );
}

export function connectStatusProvider(payload: unknown): "RAZORPAY" | "STRIPE" | undefined {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    typeof payload.data !== "object" ||
    payload.data === null ||
    !("provider" in payload.data)
  ) {
    return undefined;
  }
  return payload.data.provider === "RAZORPAY" || payload.data.provider === "STRIPE"
    ? payload.data.provider
    : undefined;
}

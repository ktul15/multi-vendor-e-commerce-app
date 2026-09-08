import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
  validMutation,
} from "./session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const failure = (message: string, status: number, errors?: unknown) =>
  NextResponse.json({ errors, message, success: false }, { status });

export async function forwardPromoMutation(
  request: NextRequest,
  method: "DELETE" | "POST" | "PUT",
  id?: string,
) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);
  if (id !== undefined && !uuidPattern.test(id)) return failure("Invalid promo code ID", 400);

  let body: string | undefined;
  if (method !== "DELETE") {
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return failure("Promo request body is invalid", 400);
      }
      body = JSON.stringify(parsed);
    } catch {
      return failure("Promo request body must be valid JSON", 400);
    }
  }

  let session: Awaited<ReturnType<typeof resolveRequestSession>>;
  try {
    session = await resolveRequestSession(request);
  } catch {
    return failure("Session service unavailable", 503);
  }
  if (session.kind === "unauthenticated") return failure("Authentication required", 401);
  if (session.kind === "forbidden") return failure("Admin access required", 403);

  const finalize = (response: NextResponse) => {
    if (session.rotatedTokens) {
      applyCookieWrites(response, rotateRequestSession(request, session.rotatedTokens));
    }
    return response;
  };
  const token = session.rotatedTokens?.accessToken ?? requestCredentials(request).accessToken;
  const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!token || !apiBase) return finalize(failure("Promo service is unavailable", 503));

  try {
    const response = await fetch(`${apiBase}/promo-codes${id ? `/${id}` : ""}`, {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      method,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => ({
      message: response.ok ? "Promo updated" : "Promo request failed",
      success: response.ok,
    }));
    return finalize(NextResponse.json(payload, { status: response.status }));
  } catch {
    return finalize(failure("Promo service is unavailable", 503));
  }
}

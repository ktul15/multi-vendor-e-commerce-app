import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
  validMutation,
} from "../../../src/lib/session";

const bodySchema = z.object({ rate: z.number().min(0).max(100) });
const failure = (message: string, status: number, errors?: unknown) =>
  NextResponse.json({ errors, message, success: false }, { status });

export async function PATCH(request: NextRequest) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);
  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return failure("Validation failed", 400, parsed.error.issues);

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
  if (!token || !apiBase) return finalize(failure("Commission service unavailable", 503));
  try {
    const response = await fetch(`${apiBase}/admin/commission`, {
      body: JSON.stringify(parsed.data),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      method: "PATCH",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    const payload = await response.json().catch(() => ({}));
    return finalize(NextResponse.json(payload, { status: response.status }));
  } catch {
    return finalize(failure("Commission service unavailable", 503));
  }
}

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

export async function forwardCategoryMutation(
  request: NextRequest,
  method: "DELETE" | "POST" | "PUT",
  id?: string,
) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);
  if (id !== undefined && !uuidPattern.test(id)) return failure("Invalid category ID", 400);

  let body: FormData | undefined;
  if (method !== "DELETE") {
    try {
      body = await request.formData();
    } catch {
      return failure("Category form data is invalid", 400);
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
  if (!token || !apiBase) return finalize(failure("Category service is unavailable", 503));

  try {
    const response = await fetch(`${apiBase}/categories${id ? `/${id}` : ""}`, {
      body,
      headers: { Authorization: `Bearer ${token}` },
      method,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({
      message: response.ok ? "Category updated" : "Category request failed",
      success: response.ok,
    }));
    return finalize(NextResponse.json(payload, { status: response.status }));
  } catch {
    return finalize(failure("Category service is unavailable", 503));
  }
}

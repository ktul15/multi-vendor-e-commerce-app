import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
  validMutation,
} from "../../../../src/lib/session";

function failure(message: string, status: number) {
  return NextResponse.json({ message, success: false }, { status });
}

function responseMessage(payload: unknown, fallback: string): string {
  return typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : fallback;
}

export async function DELETE(
  request: NextRequest,
  { params }: Readonly<{ params: Promise<Readonly<{ id: string }>> }>,
) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return failure("Invalid product ID", 400);
  }

  let session: Awaited<ReturnType<typeof resolveRequestSession>>;
  try {
    session = await resolveRequestSession(request);
  } catch {
    return failure("Session service unavailable", 503);
  }
  if (session.kind === "unauthenticated") return failure("Authentication required", 401);
  if (session.kind === "forbidden") return failure("Vendor access required", 403);

  const finalize = (response: NextResponse) => {
    if (session.rotatedTokens) {
      applyCookieWrites(response, rotateRequestSession(request, session.rotatedTokens));
    }
    return response;
  };

  const accessToken = session.rotatedTokens?.accessToken ?? requestCredentials(request).accessToken;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) return finalize(failure("Product service unavailable", 503));

  try {
    const backendResponse = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/products/${id}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "DELETE",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    const payload: unknown = await backendResponse.json().catch(() => undefined);
    const response = backendResponse.ok
      ? NextResponse.json({
          message: responseMessage(payload, "Product deleted successfully"),
          success: true,
        })
      : failure(responseMessage(payload, "Product could not be deleted"), backendResponse.status);
    return finalize(response);
  } catch {
    return finalize(failure("Product service unavailable", 503));
  }
}

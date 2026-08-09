import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { productFormSchema } from "../../../../src/lib/product-form-schema";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
  validMutation,
} from "../../../../src/lib/session";

function failure(message: string, status: number, errors?: unknown) {
  return NextResponse.json({ errors, message, success: false }, { status });
}

function validProductId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function backendJson(url: string, token: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method,
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });
  const payload: unknown = await response.json().catch(() => undefined);
  return { payload, response };
}

export async function PUT(
  request: NextRequest,
  { params }: Readonly<{ params: Promise<Readonly<{ id: string }>> }>,
) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);
  const { id } = await params;
  if (!validProductId(id)) return failure("Invalid product ID", 400);
  const parsed = productFormSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return failure("Validation failed", 400, parsed.error.issues);

  let session: Awaited<ReturnType<typeof resolveRequestSession>>;
  try {
    session = await resolveRequestSession(request);
  } catch {
    return failure("Session service unavailable", 503);
  }
  if (session.kind === "unauthenticated") return failure("Authentication required", 401);
  if (session.kind === "forbidden") return failure("Vendor access required", 403);
  const finalize = (response: NextResponse) => {
    if (session.rotatedTokens)
      applyCookieWrites(response, rotateRequestSession(request, session.rotatedTokens));
    return response;
  };
  const token = session.rotatedTokens?.accessToken ?? requestCredentials(request).accessToken;
  const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!token || !apiBase) return finalize(failure("Product service unavailable", 503));

  try {
    const updated = await backendJson(
      `${apiBase}/products/${id}/editor`,
      token,
      "PUT",
      parsed.data,
    );
    if (!updated.response.ok) {
      return finalize(
        failure(
          responseMessage(updated.payload, "Product could not be updated"),
          updated.response.status,
          responseErrors(updated.payload),
        ),
      );
    }
    return finalize(NextResponse.json(updated.payload, { status: updated.response.status }));
  } catch {
    return finalize(failure("Product service unavailable", 503));
  }
}

function responseMessage(payload: unknown, fallback: string): string {
  return typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : fallback;
}

function responseErrors(payload: unknown): unknown {
  return typeof payload === "object" && payload !== null && "errors" in payload
    ? payload.errors
    : undefined;
}

export async function DELETE(
  request: NextRequest,
  { params }: Readonly<{ params: Promise<Readonly<{ id: string }>> }>,
) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);
  const { id } = await params;
  if (!validProductId(id)) {
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

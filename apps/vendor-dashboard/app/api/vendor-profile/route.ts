import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
  validMutation,
} from "../../../src/lib/session";
import {
  MAX_STORE_IMAGE_BYTES,
  STORE_IMAGE_TYPES,
  storeProfileSchema,
} from "../../../src/lib/store-profile-schema";

function failure(message: string, status: number, errors?: unknown) {
  return NextResponse.json({ errors, message, success: false }, { status });
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

async function sessionFor(request: NextRequest) {
  try {
    return await resolveRequestSession(request);
  } catch {
    return undefined;
  }
}

type AuthenticatedSession = Extract<
  Awaited<ReturnType<typeof resolveRequestSession>>,
  { kind: "authenticated" }
>;

function finalize(request: NextRequest, session: AuthenticatedSession, response: NextResponse) {
  if (session.rotatedTokens) {
    applyCookieWrites(response, rotateRequestSession(request, session.rotatedTokens));
  }
  return response;
}

function credentials(request: NextRequest, session: AuthenticatedSession) {
  const token = session.rotatedTokens?.accessToken ?? requestCredentials(request).accessToken;
  const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
  return token && apiBase ? { apiBase, token } : undefined;
}

export async function GET(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session) return failure("Session service unavailable", 503);
  if (session.kind === "unauthenticated") return failure("Authentication required", 401);
  if (session.kind === "forbidden") return failure("Vendor access required", 403);
  const auth = credentials(request, session);
  if (!auth) return finalize(request, session, failure("Store profile service unavailable", 503));

  try {
    const backend = await fetch(`${auth.apiBase}/vendor-profile/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${auth.token}` },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    const payload: unknown = await backend.json().catch(() => undefined);
    return finalize(
      request,
      session,
      backend.ok
        ? NextResponse.json(payload, { status: backend.status })
        : failure(
            responseMessage(payload, "Store profile could not be loaded"),
            backend.status,
            responseErrors(payload),
          ),
    );
  } catch {
    return finalize(request, session, failure("Store profile service unavailable", 503));
  }
}

export async function PUT(request: NextRequest) {
  if (!validMutation(request)) return failure("Invalid CSRF or request origin", 403);

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return failure("Request body must be multipart form data", 400);
  }

  const storeName = incoming.get("storeName");
  const description = incoming.get("description");
  const logo = incoming.get("logo");
  const banner = incoming.get("banner");
  const text = storeProfileSchema.safeParse({ description, storeName });
  if (!text.success) {
    return failure(
      "Validation failed",
      400,
      text.error.issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }

  for (const [field, file] of [
    ["logo", logo],
    ["banner", banner],
  ] as const) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!STORE_IMAGE_TYPES.some((type) => type === file.type)) {
      return failure("Validation failed", 400, [
        { field, message: "Choose a JPEG, PNG, or WebP image." },
      ]);
    }
    if (file.size > MAX_STORE_IMAGE_BYTES) {
      return failure("Validation failed", 413, [
        { field, message: "Image must be 5 MB or smaller." },
      ]);
    }
  }

  const session = await sessionFor(request);
  if (!session) return failure("Session service unavailable", 503);
  if (session.kind === "unauthenticated") return failure("Authentication required", 401);
  if (session.kind === "forbidden") return failure("Vendor access required", 403);
  const auth = credentials(request, session);
  if (!auth) return finalize(request, session, failure("Store profile service unavailable", 503));

  const outgoing = new FormData();
  outgoing.set("storeName", text.data.storeName);
  outgoing.set("description", text.data.description);
  if (logo instanceof File && logo.size > 0) outgoing.set("logo", logo);
  if (banner instanceof File && banner.size > 0) outgoing.set("banner", banner);

  try {
    const backend = await fetch(`${auth.apiBase}/vendor-profile/me`, {
      body: outgoing,
      headers: { Authorization: `Bearer ${auth.token}` },
      method: "PUT",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await backend.json().catch(() => undefined);
    return finalize(
      request,
      session,
      backend.ok
        ? NextResponse.json(payload, { status: backend.status })
        : failure(
            responseMessage(payload, "Store profile could not be saved"),
            backend.status,
            responseErrors(payload),
          ),
    );
  } catch {
    return finalize(request, session, failure("Store profile service unavailable", 503));
  }
}

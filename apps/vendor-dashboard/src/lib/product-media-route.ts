import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyCookieWrites,
  requestCredentials,
  resolveRequestSession,
  rotateRequestSession,
  validMutation,
} from "./session";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(message: string, status: number, errors?: readonly unknown[]) {
  return NextResponse.json(
    { success: false, message, ...(errors?.length ? { errors } : {}) },
    { status },
  );
}

function apiFailure(error: unknown) {
  return error instanceof ApiClientError
    ? failure(error.message, error.status || 503, error.fieldErrors)
    : failure("Product media service unavailable", 503);
}

type MutationContext =
  | Readonly<{ kind: "failure"; response: NextResponse }>
  | Readonly<{
      client: ReturnType<typeof createApiClient>;
      finalize: (response: NextResponse) => NextResponse;
      kind: "ready";
    }>;

async function mutationContext(request: NextRequest): Promise<MutationContext> {
  if (!validMutation(request))
    return { kind: "failure", response: failure("Invalid CSRF or request origin", 403) };
  let session: Awaited<ReturnType<typeof resolveRequestSession>>;
  try {
    session = await resolveRequestSession(request);
  } catch {
    return { kind: "failure", response: failure("Session service unavailable", 503) };
  }
  if (session.kind === "unauthenticated")
    return { kind: "failure", response: failure("Authentication required", 401) };
  if (session.kind === "forbidden")
    return { kind: "failure", response: failure("Vendor access required", 403) };
  const accessToken = session.rotatedTokens?.accessToken ?? requestCredentials(request).accessToken;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl)
    return { kind: "failure", response: failure("Product media service unavailable", 503) };
  return {
    client: createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken }),
    finalize(response: NextResponse) {
      if (session.rotatedTokens) {
        applyCookieWrites(response, rotateRequestSession(request, session.rotatedTokens));
      }
      return response;
    },
    kind: "ready",
  };
}

export function validMediaId(value: string) {
  return uuid.test(value);
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string" && typeof value.arrayBuffer === "function";
}

export async function uploadProductMedia(
  request: NextRequest,
  productId: string,
): Promise<NextResponse> {
  if (!validMediaId(productId)) return failure("Invalid product ID", 400);
  const context = await mutationContext(request);
  if (context.kind === "failure") return context.response;
  try {
    const form = await request.formData();
    const images = form.getAll("images").filter(isUploadedFile);
    if (images.length === 0)
      return context.finalize(failure("At least one image is required", 400));
    const { data } = await context.client.POST("/products/{id}/media", {
      body: { images },
      bodySerializer: () => form,
      params: { path: { id: productId } },
    });
    return context.finalize(NextResponse.json(data, { status: 201 }));
  } catch (error) {
    return context.finalize(apiFailure(error));
  }
}

export async function replaceProductMedia(
  request: NextRequest,
  productId: string,
  mediaId: string,
): Promise<NextResponse> {
  if (!validMediaId(productId) || !validMediaId(mediaId)) return failure("Invalid media ID", 400);
  const context = await mutationContext(request);
  if (context.kind === "failure") return context.response;
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!image || !isUploadedFile(image)) {
      return context.finalize(failure("Image is required", 400));
    }
    const { data } = await context.client.PUT("/products/{id}/media/{mediaId}", {
      body: { image },
      bodySerializer: () => form,
      params: { path: { id: productId, mediaId } },
    });
    return context.finalize(NextResponse.json(data));
  } catch (error) {
    return context.finalize(apiFailure(error));
  }
}

export async function removeProductMedia(
  request: NextRequest,
  productId: string,
  mediaId: string,
): Promise<NextResponse> {
  if (!validMediaId(productId) || !validMediaId(mediaId)) return failure("Invalid media ID", 400);
  const context = await mutationContext(request);
  if (context.kind === "failure") return context.response;
  try {
    const { data } = await context.client.DELETE("/products/{id}/media/{mediaId}", {
      params: { path: { id: productId, mediaId } },
    });
    return context.finalize(NextResponse.json(data));
  } catch (error) {
    return context.finalize(apiFailure(error));
  }
}

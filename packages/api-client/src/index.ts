import createOpenApiClient from "openapi-fetch";
import type { Middleware } from "openapi-fetch";
import type { paths } from "./generated/schema";

export type { components, operations, paths } from "./generated/schema";

export type ApiSuccess<T> = Readonly<{
  success: true;
  message: string;
  data: T;
}>;

export type ApiFieldError = Readonly<{ field?: string; message: string }>;

export type ApiFailure = Readonly<{
  success: false;
  message: string;
  errors?: readonly ApiFieldError[];
}>;

export class ApiClientError extends Error {
  readonly fieldErrors: readonly ApiFieldError[];
  readonly status: number;

  constructor(message: string, status = 0, fieldErrors: readonly ApiFieldError[] = []) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeApiError(value: unknown, status = 0): ApiClientError {
  if (value instanceof ApiClientError) return value;
  if (value instanceof DOMException && value.name === "AbortError") {
    return new ApiClientError("Request cancelled", status);
  }
  if (isRecord(value)) {
    const message = typeof value.message === "string" ? value.message : "Request failed";
    const fieldErrors = Array.isArray(value.errors)
      ? value.errors.flatMap((entry) =>
          isRecord(entry) && typeof entry.message === "string"
            ? [
                {
                  field: typeof entry.field === "string" ? entry.field : undefined,
                  message: entry.message,
                },
              ]
            : [],
        )
      : [];
    return new ApiClientError(message, status, fieldErrors);
  }
  return new ApiClientError(value instanceof Error ? value.message : "Request failed", status);
}

export function unwrapApiResponse<const T extends ApiSuccess<unknown>>(value: T): T["data"] {
  if (isRecord(value) && value.success === true && "data" in value) return value.data;
  throw normalizeApiError(value);
}

export function serializeMultipartBody(body: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, rawValue] of Object.entries(body)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value === undefined || value === null) continue;
      form.append(key, value instanceof Blob ? value : String(value));
    }
  }
  return form;
}

const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return;
    const payload = await response
      .clone()
      .json()
      .catch(() => undefined);
    throw normalizeApiError(payload, response.status);
  },
  onError({ error }) {
    return normalizeApiError(error);
  },
};

export type ApiClientOptions = Readonly<{
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () => null | string | Promise<null | string>;
}>;

export function createAuthenticatedFetch({
  apiOrigin,
  fetch = globalThis.fetch,
  getAccessToken,
}: Readonly<{
  apiOrigin: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken: () => null | string | Promise<null | string>;
}>): typeof globalThis.fetch {
  const trustedOrigin = new URL(apiOrigin).origin;
  return async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).origin !== trustedOrigin) return fetch(request);

    const token = await getAccessToken();
    if (!token || request.headers.has("Authorization")) return fetch(request);
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(new Request(request, { headers }));
  };
}

export function createApiClient({ baseUrl, fetch, getAccessToken }: ApiClientOptions) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const authenticatedFetch = getAccessToken
    ? createAuthenticatedFetch({ apiOrigin: normalizedBaseUrl, fetch, getAccessToken })
    : fetch;
  const client = createOpenApiClient<paths>({
    baseUrl: normalizedBaseUrl,
    credentials: "include",
    fetch: authenticatedFetch,
  });
  client.use(errorMiddleware);
  return client;
}

# Shared API client

`@repo/api-client` is the browser-safe, OpenAPI-typed HTTP client shared by the vendor and admin dashboards.

```ts
import { createApiClient } from "@repo/api-client";

const api = createApiClient({ baseUrl: process.env.API_BASE_URL! });
const { data } = await api.GET("/products", {
  params: { query: { page: 1, search: "phone" } },
  signal: abortController.signal,
});
```

Web dashboards opt into HttpOnly cookies by sending `X-Auth-Mode: cookie` on login; the client uses `credentials: "include"` and echoes the non-secret CSRF token as `X-CSRF-Token` on unsafe requests to the configured API origin. It reads a same-host `__Secure-csrf_token` cookie when available and retains the CORS-exposed response header for cross-host API deployments and token rotation. Server/BFF callers can provide `getCsrfToken` explicitly. Bearer clients can supply a token getter instead of a fixed token: it is resolved per request and attached only when the request origin exactly matches the configured API origin. HTTP, validation, network, and cancellation failures reject with `ApiClientError`; field-level validation messages are available through `fieldErrors`. Use `serializeMultipartBody` as a request `bodySerializer` for multipart endpoints so the browser supplies the boundary header.

The contract flow is:

1. Backend route documentation generates `backend/openapi.json`.
2. `openapi-typescript` generates immutable types in `src/generated/schema.ts`.
3. CI checks both committed artifacts for drift.

Run `pnpm api:generate` after changing backend OpenAPI documentation. Run `pnpm api:check` when both backend and web dependencies are installed, or the individual `openapi:check` and `api:types:check` commands in their respective CI jobs.

# Shared API client

`@repo/api-client` is the browser-safe, OpenAPI-typed HTTP client shared by the vendor and admin dashboards.

```ts
import { createApiClient } from "@repo/api-client";

const api = createApiClient({
  baseUrl: process.env.API_BASE_URL!,
  getAccessToken: () => sessionStore.getAccessToken(),
});
const { data } = await api.GET("/products", {
  params: { query: { page: 1, search: "phone" } },
  signal: abortController.signal,
});
```

The backend currently authenticates with bearer access tokens. Supply a token getter rather than a fixed token: the client resolves it per request and attaches it only when the request origin exactly matches the configured API origin. `credentials: "include"` also keeps the transport ready for the cookie-auth migration in issue #82. HTTP, validation, network, and cancellation failures reject with `ApiClientError`; field-level validation messages are available through `fieldErrors`. Use `serializeMultipartBody` as a request `bodySerializer` for multipart endpoints so the browser supplies the boundary header.

The contract flow is:

1. Backend route documentation generates `backend/openapi.json`.
2. `openapi-typescript` generates immutable types in `src/generated/schema.ts`.
3. CI checks both committed artifacts for drift.

Run `pnpm api:generate` after changing backend OpenAPI documentation. Run `pnpm api:check` when both backend and web dependencies are installed, or the individual `openapi:check` and `api:types:check` commands in their respective CI jobs.

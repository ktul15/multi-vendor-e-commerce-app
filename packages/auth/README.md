# Shared dashboard authentication

`@repo/auth` owns the framework-neutral session contract used by both Next.js dashboards.

- Dashboard access and refresh credentials are host-only, HttpOnly cookies with distinct vendor and admin names.
- The readable CSRF cookie contains no authentication credential and must match `X-CSRF-Token` on same-origin mutations.
- The shared proxy resolves the backend profile before rendering, enforces `VENDOR` or `ADMIN` independently, deletes any caller-supplied session-context header, and forwards its verified minimal session summary to the protected layout. The layout does not repeat the profile request.
- Expired access credentials rotate once per opaque dashboard session. An in-process flight removes duplicate work on one instance, while the backend atomically consumes the old credential and publishes an encrypted three-second result bound to that opaque session proof.
- Grace replay is deliberately unavailable to bearer clients that omit `X-Refresh-Rotation-Key`; possession of an old refresh token alone is not sufficient to retrieve a replacement pair.
- Missing or unrecoverable sessions redirect to `/login` with a validated relative `returnTo`; wrong roles redirect to `/forbidden`. Every redirect is resolved against the configured dashboard origin, never the incoming Host value.
- Transient backend errors propagate to route error handling and never masquerade as logout.
- Logout attempts backend revocation, always clears the dashboard-host cookies, and redirects to `/login`.
- Dashboard entry routes proxy credentials server-side, reject cross-origin submissions, force the intended account role, and establish isolated dashboard-host sessions only after the backend response is validated.
- Dashboard-to-backend auth calls carry short-lived HMAC signatures over per-account or opaque per-session rate-limit identities, a hashed client identity, and the dashboard source. The backend enforces identity, client, and dashboard-wide ceilings independently, so neither shared server egress nor attacker-rotated identities bypass throttling.
- `DASHBOARD_TRUSTED_CLIENT_IP_HEADER` must name an infrastructure-controlled header that the dashboard's trusted reverse proxy overwrites and strips from public requests. Production rejects missing configuration or request values; raw client addresses are never sent to the API.

Never expose the access token, refresh token, or raw backend cookies to client components, browser storage, URLs, logs, or hydrated props.

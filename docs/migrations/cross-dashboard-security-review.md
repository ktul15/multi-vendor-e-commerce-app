# Cross-dashboard security review

Reviewed for issue #118 on 2026-08-18 and revalidated during issue #123 on 2026-09-12. The scope covers the Next.js vendor and admin dashboards, their server-side BFF routes, and the Express API boundaries they use.

## Findings and disposition

| Area                      | Review result | Evidence or remediation                                                                                                                                                                                                                                                       |
| ------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication and logout | Pass          | Dashboard tokens remain in host-only `HttpOnly`, `Secure` production cookies; refresh tokens rotate; logout attempts server-side revocation and clears all session cookies even if revocation fails. Production now refuses missing, short, or shared JWT signing secrets.    |
| Authorization and IDOR    | Pass          | Next BFF mutations resolve a backend-verified role before forwarding. Express routes enforce ADMIN/VENDOR roles, approved-vendor state, and vendor ownership. Cross-role admin access and cross-vendor product reads are regression-tested.                                   |
| CSRF                      | Pass          | Dashboard mutations require exact configured origin, non-cross-site Fetch Metadata, and constant-time double-submit token comparison. Login and registration require the exact configured origin. Bearer API clients do not fall back to cookie credentials.                  |
| CORS and cookies          | Pass          | Credentialed CORS uses an exact three-origin allowlist. Cookie scope, `SameSite=Lax`, secure transport, expiry, and logout clearing are covered by backend and shared-auth tests.                                                                                             |
| Redirects                 | Fixed         | Dashboard redirects resolve only against configured origins and sanitize relative return paths. Stripe Connect return/refresh targets are server-only configuration and must now be HTTP(S) URLs on `VENDOR_DASHBOARD_URL` (HTTPS in production).                             |
| Uploads                   | Fixed         | All Multer image routes enforce field count, 5 MB size, declared JPEG/PNG/WebP MIME type, and matching file signatures before controllers or Cloudinary receive bytes. Product ownership remains authoritative in the service transaction.                                    |
| Sensitive data            | Pass          | Only the app origin is public dashboard configuration. API/BFF secrets remain server-only; browser login responses omit tokens; admin user projections omit password hashes; media responses omit provider public IDs; unexpected production errors are generic.              |
| Headers and transport     | Pass          | Helmet supplies CSP, HSTS, anti-sniffing, frame, referrer, opener, and resource policies. Production dashboard/API origins must use HTTPS.                                                                                                                                    |
| Production dependencies   | Fixed         | Dashboard audit reports no known vulnerabilities after Next.js 16.3.3, Sharp 0.35.4, and the Nanoid override. The Node 24.15 backend production image reports zero vulnerabilities after patched upload/mail/transitive packages and omission of optional Prisma CLI tooling. |

## Regression coverage

- `cross-dashboard-security.test.ts`: ADMIN/VENDOR/CUSTOMER role boundaries, cross-vendor product isolation, and safe admin user projections.
- `environment-security.test.ts`: strong distinct JWT secrets and same-origin Stripe Connect redirects.
- `upload-security.test.ts`: valid signatures, disguised executable content, and MIME/signature mismatch.
- Existing backend browser-security tests: exact CORS, CSRF, bearer precedence, cookie bootstrap, and Helmet production headers.
- Existing `@repo/auth` and dashboard route tests: safe return paths, trusted redirect origins, wrong-role sessions, cookie clearing, BFF CSRF, and token-free browser responses.

## Residual non-blocking items

The full backend development lockfile reports advisories in Prisma CLI dependencies used only to generate clients and run migrations. npm proposes an incompatible Prisma downgrade, while current Prisma 7 releases retain the affected tooling chain. The production image omits optional and development packages, contains neither Prisma CLI nor its MySQL/config dependencies, and audits clean. Reassess when Prisma publishes a compatible patched tooling chain.

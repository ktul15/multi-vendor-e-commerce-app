# Admin settings scope decision

Decision date: 2026-08-16

Decision owner: product owner

Status: approved for the Next.js admin-panel migration

## Decision

The admin panel will not ship a standalone **Settings** destination. The legacy Flutter route and the temporary Next.js route were placeholders without product behavior or a backend contract. Unsupported platform, notification, payment-credential, tax, shipping, feature-flag, and personal-preference controls are therefore excluded rather than represented by inactive UI.

The approved administrative configuration remains next to the workflows it affects:

| Configuration               | UI owner                     | API contract                                        | Allowed values                                                           |
| --------------------------- | ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Platform default commission | `/finance`                   | `GET /admin/commission`; `PATCH /admin/commission`  | Percentage from 0 through 100                                            |
| Vendor commission override  | `/vendors/[vendorProfileId]` | `PATCH /admin/vendors/{vendorProfileId}/commission` | Percentage from 0 through 100, or `null` to inherit the platform default |

No new setting or generic key/value administration endpoint is approved by this decision. A future setting requires its own product requirement, typed API contract, authorization policy, validation, user interface, audit classification, and tests before it can be added to navigation.

## Authorization and mutation requirements

- Backend admin middleware requires an authenticated `ADMIN` role for all approved commission contracts.
- The dashboard BFF independently requires an authenticated admin session, a trusted mutation origin, and a valid CSRF token before forwarding either mutation.
- Both interfaces validate the same 0–100 range as the backend and require explicit confirmation. Vendor overrides can be removed explicitly to restore inheritance.
- Successful mutations refresh authoritative backend state. Errors retain the prior displayed value and provide a retryable message.
- Commission changes affect future earnings calculations; existing earning records retain the rate and amounts captured when they were created.
- Environment variables and payment credentials are deployment configuration and must never be exposed through an admin mutation.

## Audit requirements

`PlatformSetting.updatedAt` records only the latest platform-setting write. It does not identify the actor or preserve history, and vendor commission overrides likewise have no durable change history. This limitation is explicit; it must not be presented as an audit log.

Any future durable audit implementation for commission mutations must record the authenticated admin user ID, target and setting key, previous and new values, outcome, timestamp, and request/correlation ID. Audit records must be append-only, must not contain credentials or tokens, and must be covered by authorization, retention, and redaction tests.

## Verification

- Navigation tests assert that Settings is absent while every approved destination remains linked.
- The production route tree contains no `/settings` page or placeholder component.
- Existing commission data, component, and BFF-route tests cover reads, validation, confirmation, authorization, CSRF enforcement, mutation forwarding, vendor inheritance, and error handling.

# Vendor Dashboard Flutter-to-Next.js Parity Matrix

Status: Baseline for issue #72

Source application: `vendor_dashboard/` (Flutter)

Target application: `apps/vendor-dashboard/` (Next.js)

API base path: `/api/v1`

Baseline verified: 2026-08-01 at commit `4e09a140ecb421502e520ef6af625804aeee2bd8`

## Purpose

This document is the feature-parity contract for replacing the Flutter vendor dashboard with the Next.js vendor dashboard. It records current behavior, backend enforcement, target routes, required UI states, and migration decisions. A row marked **Fix during migration** describes an existing limitation or defect and must not be copied into the new application.

## Access model

| User/profile state | Flutter behavior | Backend behavior | Next.js requirement |
|---|---|---|---|
| No session | Redirects every protected route to `/login` | Protected endpoints return 401 | Perform a server-aware redirect to `/login` and retain a safe return path. Never flash protected content. |
| Authenticated non-vendor | Login client rejects the role; profile restoration also rejects it | Vendor endpoints return 403 | Show access denied, clear/ignore the dashboard session, and never render vendor data. |
| Vendor with `PENDING` profile | Can open `/store`; dashboard, products, orders, and earnings show the status gate | Profile GET, profile update, and informational Connect-status GET are allowed. Operational APIs and Connect onboarding require approval. | Show an under-review state. Permit store-profile viewing/editing and logout. Connect status may be shown as read-only account information, but onboarding and operational tools stay unavailable. |
| Vendor with `REJECTED` profile | Can open `/store` read-only; operational routes show the rejected gate | Profile GET and informational Connect-status GET are allowed. Profile update, Connect onboarding, and operational APIs return 403. | Explain rejection, keep profile read-only, expose logout, and do not call operational or onboarding APIs. Connect status may only be shown as read-only information. |
| Vendor with `SUSPENDED` profile | Can open `/store` read-only; operational routes show the suspended gate | Same restriction as rejected | Explain suspension, keep profile read-only, expose logout, and do not call operational APIs. |
| Vendor with `APPROVED` profile | All current routes are available | Vendor operations are authorized; ownership is checked in services | Allow all implemented vendor functions, subject to resource ownership. |
| Expired access token with valid refresh token | Dio refreshes and retries a failed request | `/auth/refresh` rotates/returns tokens | Refresh once for concurrent failures, retry safely, and preserve the route. |
| Invalid/expired refresh token | Tokens are cleared after refresh failure; router returns to login | Returns 401 | Clear the web session and redirect to `/login`; mutations must not retry indefinitely. |

The backend remains the authorization boundary. Next.js route guards and hidden controls are user-experience measures, not substitutes for `authenticate`, `authorize('VENDOR')`, approval checks, and ownership checks.

## Route and screen parity

| Area | Flutter route | Current behavior and actions | API endpoints | Required permissions | Required states | Target Next.js route | Decision |
|---|---|---|---|---|---|---|---|
| Login | `/login` | Email/password validation, password visibility toggle, submit spinner, general error snackbar, link to registration | `POST /auth/login`; startup verification uses `GET /auth/profile`; refresh uses `POST /auth/refresh` | Public; successful user role must be `VENDOR` | Idle, submitting, field validation, invalid credentials, wrong role, server/network error, success redirect | `/login` | Preserve behavior; map API field errors inline and use cookie-based browser sessions. |
| Registration | `/register` | Collects owner name, store name, email, password, confirmation; creates a vendor and automatically authenticates it | `POST /auth/register` with role `VENDOR` | Public | Idle, submitting, field validation, duplicate email/store, server/network error, success redirect | `/register` | Preserve flow; redirect the new pending vendor to the approval/status experience. |
| Session/logout | All authenticated routes | Restores stored tokens, verifies profile, refreshes 401 responses, logout clears tokens even if API logout fails | `GET /auth/profile`; `POST /auth/refresh`; `POST /auth/logout` | Authenticated vendor for profile | Initial/session check, authenticated, unauthenticated, refreshing, logout pending/failure | Shared auth boundary | Fix during migration: do not treat a transient profile network failure as definitive logout; use HttpOnly cookies instead of browser-readable token storage. |
| Responsive shell | All authenticated routes | Five navigation destinations; sidebar at width >=900px, otherwise app bar and bottom navigation; logout in shell | None directly | Authenticated vendor | Active route, narrow/wide navigation, logout pending | Shared authenticated layout | Preserve destinations initially; use an accessible sidebar/drawer suitable for desktop and tablet. |
| Approval gate | `/`, `/products`, `/orders`, `/earnings` | Fetches vendor profile before rendering; shows PENDING, REJECTED, SUSPENDED, or unknown state with store-profile and logout actions | `GET /vendor-profile/me` | Authenticated `VENDOR`; page content additionally requires `APPROVED` | Loading skeleton, retryable error, approved content, each restricted status | Shared protected layout/status route | Preserve restrictions; fetch once at the layout/session boundary rather than once per page. |
| Dashboard | `/` | Four summary cards, daily revenue chart, five recent orders, “View all” navigation | `GET /analytics/vendor/summary`; `GET /analytics/vendor/sales?period=day`; `GET /orders/vendor?page=1&limit=5` | Approved vendor | Combined skeleton, combined retryable error, zero metrics, empty chart, no recent orders, loaded | `/` | Preserve current minimum parity. Use independent query states so one failed panel does not erase all successful panels. |
| Product list | `/products` | Table of name, base price, variant count, active state, edit/delete; loads up to 100 then “Load more”; create action | `GET /products?vendorId={userId}&page={n}&limit=100` | The endpoint is public; client derives vendor ID from auth profile. Mutations require vendor ownership and approval in service code. | Missing vendor ID, skeleton, retryable error, empty list, loaded, loading next page, mutation error | `/products` | Fix during migration: use an authenticated vendor-inventory endpoint so inactive products are included and vendor identity comes from the session, not a query parameter. Add URL-backed pagination/search/filter/sort. |
| Product create | Dialog on `/products` | Name, description, base price, flattened category selector, active toggle, and one-or-more variants; creates product and reloads list | `GET /categories`; `POST /products` | Approved vendor for create; category list is public | Category loading/failure/empty, form validation, submitting, API field error, success | `/products/new` | Move to a full page. Preserve core fields and required variants; add contract-supported images and tags. |
| Product edit | Dialog on `/products` | Edits name, description, base price, active flag, existing/new variants; category is shown but not submitted on update | `GET /categories`; `PUT /products/{id}`; `POST /products/{id}/variants`; `PUT /products/{id}/variants/{variantId}` | Approved owning vendor | Initial data, category failure, validation, submitting multiple calls, partial failure, success | `/products/[id]/edit` | Fix during migration: support category, images, tags, and safe variant reconciliation. Do not report success after a partially applied multi-call update. |
| Product delete | Confirmation on `/products` | Warns that deletion cannot be undone, deletes, reloads table | `DELETE /products/{id}` | Approved owning vendor | Confirmation, deleting/disabled, conflict/constraint error, success | `/products` | Preserve explicit confirmation. Keep the row stable while pending and restore/report failure clearly. |
| Orders | `/orders` | Filters All/Pending/Confirmed/Processing/Shipped/Delivered/Cancelled; table shows order, customer, item count, subtotal, status, date, action; loads first 50 only | `GET /orders/vendor?page=1&limit=50&status={status}` | Approved vendor | Skeleton, retryable error, empty per filter, loaded, filter change, mutation error | `/orders` | Preserve data and filters; add `REFUNDED`, URL-backed filters, and server pagination. A bookmarkable detail route depends on a missing vendor order-detail endpoint tracked under #74. |
| Order progression | Dialog on `/orders` | Presents the single forward transition as text; requires tracking number/carrier for `SHIPPED`; terminal states show no action | `PUT /orders/vendor/{vendorOrderId}/status` | Approved vendor owning the vendor order | Confirmation, tracking validation, submitting, stale transition/conflict, success, terminal | `/orders`; planned `/orders/[id]` after API support | Preserve the forward-only rule. Use a direct contextual action when exactly one transition exists; never show a one-option dropdown. The detail route must not ship until a vendor-owned detail endpoint can hydrate direct loads safely. |
| Earnings analytics | `/earnings` | Gross/net/commission cards, day/week/month chart, top ten products | `GET /analytics/vendor/summary`; `GET /analytics/vendor/sales?period={day|week|month}`; `GET /analytics/vendor/top-products?limit=10` | Approved vendor | Skeleton, retryable error, zero summary, empty chart, empty top products, period reload, loaded | `/earnings` | Preserve analytics; keep previous content visible while changing period and expose partial-panel failures. |
| Store profile | `/store` | Shows approval badge; edits store name and description for PENDING/APPROVED; REJECTED/SUSPENDED are read-only | `GET /vendor-profile/me`; `PUT /vendor-profile/me` | Any vendor can view; only PENDING/APPROVED can edit | Skeleton, retryable error, read-only status, validation, saving, success toast, failure | `/store` | Preserve access rules. Add logo/banner upload supported by the backend and submit multipart data when files are present. |
| Stripe Connect | No Flutter route or UI | Not currently reachable from the vendor dashboard | `POST /vendor-payouts/connect/onboard`; `GET /vendor-payouts/connect/onboard/refresh`; `GET /vendor-payouts/connect/status` | Status: any vendor; onboarding/refresh: approved vendor | Not connected, onboarding incomplete, restricted, charges enabled, payouts enabled, redirect failure | Approved vendors: `/earnings`, `/stripe/return`, and `/stripe/refresh`; restricted vendors: optional read-only status in the approval/store experience | Fix during migration: this is a backend capability missing from Flutter, but required by the planned web dashboard. Never expose an onboarding action before approval. |
| Earnings ledger | No Flutter route or UI | Current page uses sales analytics only; it does not show vendor earning records or payout balances | `GET /vendor-payouts/earnings`; `GET /vendor-payouts/earnings/summary` | Approved vendor | Loading, empty, paginated, pending/transferred/failed/reversed, retryable error | `/earnings` | Fix during migration: distinguish sales analytics from payable vendor earnings. |
| Payout history | No Flutter route or UI | No payout list is exposed | `GET /vendor-payouts/payouts` | Approved vendor | Loading, empty, paginated, pending/paid/failed, retryable error | `/earnings` | Fix during migration: add payout history and explain delayed/unavailable payouts. |

## Action and API inventory

| User action | Method and endpoint | Request/query | Important response data | Refresh/invalidation requirement |
|---|---|---|---|---|
| Sign in | `POST /auth/login` | `email`, `password` | user and access/refresh tokens | Establish session; fetch profile; route by role/status. |
| Apply as vendor | `POST /auth/register` | `name`, `email`, `password`, `role=VENDOR`, `storeName` | pending vendor user and tokens | Establish session; fetch vendor profile. |
| Restore identity | `GET /auth/profile` | None | `userId`, role, identity fields | Populate session identity. |
| Refresh session | `POST /auth/refresh` | Current refresh token in existing API contract | rotated/new tokens | Retry the original request once. |
| Sign out | `POST /auth/logout` | Refresh token in existing API contract | Success envelope | Clear session even when the logout request fails. |
| Read vendor status/profile | `GET /vendor-profile/me` | None | profile ID, store name, description, logo/banner URLs, status | Invalidate after profile update and after returning from approval/admin changes. |
| Edit vendor profile | `PUT /vendor-profile/me` | Multipart: optional `storeName`, `description`, `logo`, `banner`. OpenAPI says at least one change, but runtime validation currently accepts an empty body. | updated profile | Invalidate profile, shell status, and store query. **Contract gap for #74:** enforce at least one text/file change or correct the API documentation. |
| Dashboard totals | `GET /analytics/vendor/summary` | Optional `startDate`, `endDate` | order counts and gross/net/commission revenue | Date-range key; refresh after relevant order changes. |
| Sales series | `GET /analytics/vendor/sales` | `period`; optional dates | grouped revenue/order series | Period/date-range key. |
| Top products | `GET /analytics/vendor/top-products` | `limit`; optional dates | rank, product, order count, revenue | Date-range/limit key. |
| List recent/vendor orders | `GET /orders/vendor` | `page`, `limit`, optional `status` | `items`, pagination `meta` | Key by page/filter. |
| Read one vendor order | Missing | Planned vendor-order ID path | Vendor-owned order with customer, items, tracking, totals, and status | **Contract gap for #74:** add an approved-vendor, ownership-scoped detail endpoint before `/orders/[id]` is implemented. |
| Advance order | `PUT /orders/vendor/{id}/status` | `status`; tracking number/carrier when shipping | updated vendor order | Invalidate order list/detail, dashboard, analytics, earnings, and relevant counts. |
| Read category tree | `GET /categories` | None | recursive category tree | Cache as shared reference data; invalidate after admin category mutations if real-time coherence is required. |
| List vendor inventory | Current: `GET /products?vendorId=...` | `vendorId`, page, limit | active public products and `meta` | **Contract gap:** create an authenticated inventory endpoint before web parity. |
| Create product | `POST /products` | category, name, description, base price, images, tags, active flag, one-or-more variants | product with variants | Invalidate vendor products and relevant dashboard/catalog queries. |
| Update product | `PUT /products/{id}` | optional category, descriptive fields, images, tags, price, active flag | updated product | Invalidate list/detail/catalog. |
| Add variant | `POST /products/{id}/variants` | SKU, price, stock, optional size/color | created variant | Invalidate product list/detail/catalog. |
| Update variant | `PUT /products/{id}/variants/{variantId}` | changed variant fields | updated variant | Invalidate product list/detail/catalog. |
| Delete product | `DELETE /products/{id}` | None | HTTP 200 standard envelope with `data: null` | Remove/invalidate vendor and public product queries. |
| Start Connect onboarding | `POST /vendor-payouts/connect/onboard` | None | Stripe-hosted onboarding URL | Navigate externally; reconcile status on return. |
| Refresh Connect onboarding | `GET /vendor-payouts/connect/onboard/refresh` | None | fresh onboarding URL | Navigate externally; protect against redirect loops. |
| Read Connect status | `GET /vendor-payouts/connect/status` | None | connected, charges enabled, payouts enabled and account state | Refresh on return and when page regains focus. |
| List earnings | `GET /vendor-payouts/earnings` | page, limit, optional status/dates | earnings items and pagination | Key by filters/page; refresh after payment/payout webhook effects. |
| Earnings balance | `GET /vendor-payouts/earnings/summary` | None | lifetime, pending, transferred totals | Refresh with earnings and after webhook effects. |
| List payouts | `GET /vendor-payouts/payouts` | page, limit, optional status | payout items and pagination | Key by filters/page; refresh after payout webhook effects. |

## Validation and business rules

### Vendor registration

- Owner name: trimmed, 2–100 characters.
- Store name: required for role `VENDOR`, trimmed, 2–100 characters, and must satisfy backend uniqueness behavior.
- Email: valid email; backend normalizes to lowercase and trims.
- Password: 6–100 characters.
- Confirmation password is client-only and must match.
- Registration creates a `PENDING` vendor profile and signs the vendor in.

### Store profile

- Store name: optional in the update payload; when supplied, trimmed and 2–100 characters.
- Description: optional, trimmed, maximum 1000 characters.
- Logo and banner are optional multipart files supported by the backend but absent in Flutter.
- Only `PENDING` and `APPROVED` profiles may mutate the profile. All vendor states may read it.
- OpenAPI says an update must contain at least one text field or file, but the current Zod schema accepts an empty object. Resolve this contract gap under #74; until then, the Next.js form must suppress no-op submissions.

### Products and variants

- Product name: minimum 2 characters.
- Description: minimum 10 characters.
- Base price: the backend accepts zero or greater; the Flutter form requires greater than zero. Next.js should mirror the backend and accept zero unless product requirements deliberately change the API contract.
- Category: required UUID on create; optional valid UUID on update.
- Images: optional valid URLs, maximum five in the current API.
- Tags: optional string list.
- Every new product requires at least one variant.
- Variant SKU: non-empty and globally unique for product creation, variant addition, and SKU updates. Database uniqueness remains the final authority.
- Variant price: the backend accepts zero or greater; the Flutter form requires greater than zero. Next.js should mirror the backend and accept zero unless product requirements deliberately change the API contract.
- Variant stock: integer and non-negative; default zero.
- Size and color are optional. An absent size/color combination does not make a variant optional.
- Storefront availability is variant-driven: a product with no positive variant stock is out of stock.
- Product and variant mutations require an approved vendor and ownership of the product; the service enforces both.
- The API has no variant-delete endpoint. The Next.js form must not imply that a persisted variant can be removed until a backend contract exists.

### Vendor order state machine

```text
PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
```

- Transitions are forward-only and exactly one step at a time.
- `CANCELLED`, `REFUNDED`, and `DELIVERED` are terminal for vendor actions.
- `SHIPPED` requires both `trackingNumber` and `trackingCarrier`, each 1–100 trimmed characters.
- The backend must remain the source of truth. A stale page can receive a rejected transition and must refresh the order.
- When one transition is available, render a direct action/confirmation rather than a dropdown.

## Required page-state standard

Every migrated page or independently loaded panel must account for:

1. Initial/loading state with layout-stable skeletons.
2. Empty state that explains whether data is absent or filtered out.
3. Field-level validation for known request errors.
4. General API/network error with a safe retry where applicable.
5. Unauthorized session expiry that redirects without flashing data.
6. Forbidden role/profile state with a specific explanation.
7. Mutation-pending state that prevents duplicate submission.
8. Mutation success feedback and targeted query invalidation.
9. Mutation failure that preserves user input and existing successful data.
10. Responsive desktop/tablet layout and keyboard-visible focus.

## Known Flutter gaps and migration disposition

| Gap or defect | Evidence/current impact | Disposition |
|---|---|---|
| Vendor list uses the public product endpoint | `ProductRepository.getVendorProducts` calls `GET /products`; backend forces `isActive: true`, so inactive products disappear from vendor management | **Fix during migration.** Add an authenticated “my inventory” contract that returns active and inactive owned products. Track the backend work from the API audit. |
| Vendor identity is passed as a public product filter | UI reads `userId` from auth state and sends it as `vendorId` | **Fix during migration.** Backend derives vendor identity from the session. |
| Product editor cannot update category | The edit result includes the selected category, but `ProductsCubit.updateProduct` and repository omit `categoryId` | **Fix during migration.** Include category changes in the update request. |
| Product images and tags are supported by API but absent from Flutter form | Products parse images/tags, but create/update UI and repository do not submit them | **Fix during migration.** Implement the planned upload/media and tags experience. |
| Persisted variants cannot be deleted | No repository call or backend delete endpoint exists | **Fix contract before UI promise.** Do not silently hide this limitation. |
| Product plus variant updates are non-transactional | Product update runs first, followed by sequential add/update calls; a later failure leaves partial changes | **Fix during migration/backend contract work.** Prefer an atomic product-and-variants update or explicit partial-failure reconciliation. |
| Orders fetch only the first 50 | Cubit always requests page 1 and has no pagination | **Fix during migration.** Use server pagination and URL state. |
| `REFUNDED` is accepted by backend filtering but missing from Flutter filter chips | Refunded orders can only appear under All | **Fix during migration.** Include the status consistently. |
| Dashboard fails as one unit | Three concurrent requests are collapsed into one error state | **Fix during migration.** Give panels independent error/refresh behavior. |
| Earnings period change replaces all content with a skeleton | The whole cubit enters loading for every period change | **Fix during migration.** Retain existing content while the chart refreshes. |
| Store media is displayed in the model/API but cannot be edited | Flutter form only submits JSON text fields | **Fix during migration.** Add logo/banner upload with multipart requests. |
| Stripe Connect and payout APIs have no Flutter UI | Vendors cannot onboard or inspect payout status/history from the current dashboard | **Fix during migration.** Implement Stripe Connect in #97 and the earnings ledger/payout portions of #95. |
| Startup network errors are treated as unauthenticated | `AuthCheckRequested` catches every profile failure and emits unauthenticated | **Fix during migration.** Distinguish invalid session from offline/transient failure. |
| Browser-readable token storage | Flutter web uses shared preferences for access/refresh tokens | **Fix during migration.** Use the cookie-session work in #82–#84. |
| Duplicate approval profile fetches | Each gated route creates its own profile future | **Fix during migration.** Fetch/cache profile at the authenticated layout boundary and invalidate intentionally. |
| Order updates have no detail page, endpoint, or sufficient direct-load contract | Current table action operates from summary rows, and the backend exposes vendor list/status routes but no ownership-scoped vendor detail GET | **Fix backend contract under #74, then migrate.** Add the endpoint before `/orders/[id]` so direct navigation does not depend on cached list data. |

No known defect above should be preserved merely to achieve visual parity. Existing backend business rules and authorization behavior must be preserved unless a separately reviewed backend issue changes them.

## Parity sign-off checklist

- [ ] Every route row is implemented, explicitly deferred, or superseded by an approved decision.
- [ ] Vendor registration, authentication, refresh, logout, and wrong-role denial pass.
- [ ] PENDING, REJECTED, SUSPENDED, and APPROVED experiences pass.
- [ ] Product list includes inactive inventory and supports reliable pagination.
- [ ] Product create/edit handles categories, media, tags, and at least one valid variant.
- [ ] Variant and product updates cannot claim success after partial failure.
- [ ] Order filters include every backend status and forward transitions match the state machine.
- [ ] Shipping requires valid tracking data.
- [ ] Dashboard and earnings display INR consistently and handle independent failures.
- [ ] Store editing honors profile-state restrictions and supports logo/banner uploads.
- [ ] Stripe Connect onboarding/status, earnings ledger, and payout history are reachable.
- [ ] Loading, empty, validation, forbidden, network-error, and success states are demonstrated.
- [ ] Critical desktop/tablet and keyboard workflows pass.

## Follow-up issue mapping

- Web foundation and auth: #77–#85
- Vendor implementation: #86–#97
- Vendor validation and parity audit: #98–#102
- API contract findings, including authenticated inventory and atomic variant reconciliation: #74

## Evidence references

The matrix was verified against these primary implementation points at the baseline commit above:

- Routes and approval gate: `vendor_dashboard/lib/core/config/app_router.dart`, `vendor_dashboard/lib/shared/widgets/vendor_status_gate.dart`
- Authentication and session behavior: `vendor_dashboard/lib/features/auth/bloc/auth_bloc.dart`, `vendor_dashboard/lib/repositories/auth_repository.dart`, `vendor_dashboard/lib/core/network/api_client.dart`
- Product flows: `vendor_dashboard/lib/features/products/`, `vendor_dashboard/lib/repositories/product_repository.dart`, `backend/src/modules/product/product.routes.ts`, `backend/src/modules/product/product.service.ts`, `backend/src/modules/product/product.validation.ts`
- Order flows and state machine: `vendor_dashboard/lib/features/orders/`, `vendor_dashboard/lib/repositories/order_repository.dart`, `backend/src/modules/order/order.routes.ts`, `backend/src/modules/order/order.service.ts`, `backend/src/modules/order/order.validation.ts`
- Analytics and earnings: `vendor_dashboard/lib/features/dashboard/`, `vendor_dashboard/lib/features/earnings/`, `vendor_dashboard/lib/repositories/analytics_repository.dart`, `backend/src/modules/analytics/`, `backend/src/modules/vendor-payout/`
- Store profile: `vendor_dashboard/lib/features/store/`, `vendor_dashboard/lib/repositories/vendor_profile_repository.dart`, `backend/src/modules/vendor-profile/`, `backend/src/middleware/requireApprovedVendor.ts`

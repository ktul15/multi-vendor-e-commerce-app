# Admin Panel QA Test Scenarios

## Scope

This document covers senior QA test scenarios for the Flutter `admin_panel` app. It is based on the current app structure and behavior under `admin_panel/lib`, including:

- Authentication and route guards
- Admin shell navigation
- Dashboard
- Categories
- Users
- Vendors
- Product moderation
- Orders
- Finance
- Banners
- Promo codes
- Network, security, accessibility, and regression coverage

## Test Environment

- Run backend API and required services: PostgreSQL, Redis, Stripe/Firebase config where needed.
- Run admin panel with the intended backend:

```bash
cd admin_panel
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

Recommended test accounts:

- Valid `ADMIN` account
- Valid `CUSTOMER` account
- Valid `VENDOR` account
- Banned user account
- Expired-token admin session

Recommended seed data:

- Users: customers, vendors, banned/unbanned users, multiple pages of users
- Vendors: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`
- Products: active/inactive products, products with orders, products without orders
- Orders: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`
- Categories: root categories, nested categories, category with children, category used by products
- Banners: active/inactive banners, banners with and without link URL
- Promos: active/inactive, percentage/fixed, expired/non-expired, usage-limited
- Finance: revenue across day/week/month and commission setting

## Test Data Rules

- Use unique names/codes per run, for example `QA_CAT_20260518_001`, `QA_BANNER_001`, `QA_PROMO_001`.
- Keep at least one record in each status per module for filter validation.
- Keep more than one page of vendors, products, orders, banners, promos, and users to validate pagination or infinite scroll.
- Include long strings, special characters, decimal values, boundary values, and empty optional fields.

## Severity Guide

- `P0`: Blocks admin access or corrupts data/security.
- `P1`: Breaks major admin workflow.
- `P2`: Functional issue with workaround.
- `P3`: UI polish, copy, layout, or minor consistency issue.

## Authentication And Session

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| AUTH-001 | P0 | Admin login succeeds | Open `/login`, enter valid admin email/password, submit | User is routed to dashboard, token is stored, API requests include bearer token |
| AUTH-002 | P0 | Non-admin login is blocked | Login with valid customer/vendor credentials | Login fails with admin-access error, no token is persisted, user stays on login |
| AUTH-003 | P1 | Invalid credentials fail | Enter valid email format with wrong password | Error snackbar appears, submit button is re-enabled, no route change |
| AUTH-004 | P2 | Login validation | Submit empty form, invalid email, empty password | Inline validation appears: email required, valid email required, password required |
| AUTH-005 | P1 | Password visibility toggle | Enter password, tap visibility icon twice | Password switches visible/hidden without losing value |
| AUTH-006 | P0 | Protected route guard | Clear tokens, open `/`, `/users`, `/orders`, `/banners/create` | App redirects to `/login` |
| AUTH-007 | P1 | Authenticated user cannot return to login | Login, then open `/login` manually | App redirects to dashboard |
| AUTH-008 | P0 | Expired token logs out | Use expired/invalid access token, trigger any API call that returns 401 | Authorization header is cleared, stored tokens are cleared, user is redirected to login |
| AUTH-009 | P1 | Logout works | Click logout icon in sidebar | Server logout is attempted, tokens are cleared, user lands on login |
| AUTH-010 | P1 | Logout still clears local state if server logout fails | Simulate logout API failure | User is still logged out locally and cannot access protected pages |

## Admin Shell And Navigation

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NAV-001 | P1 | Sidebar destinations route correctly | Click Dashboard, Categories, Users, Vendors, Products, Orders, Finance, Banners, Promos | Correct page opens and selected rail item updates |
| NAV-002 | P2 | Nested routes keep shell | Open create/edit/detail routes under categories, vendors, products, orders, banners, promos | Sidebar remains visible and correct section stays selected |
| NAV-003 | P2 | Browser/deep-link support | Open valid URLs directly after login | Page loads with expected data or safe loading state |
| NAV-004 | P2 | Invalid user detail direct link | Open `/users/<id>` without route extra | App redirects back to `/users` |
| NAV-005 | P3 | Responsive layout | Test desktop, tablet, narrow web width | Navigation, tables, forms, and horizontal scroll do not overlap or clip critical actions |

## Dashboard

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| DASH-001 | P1 | Dashboard loads stats | Open dashboard | Stats cards, revenue chart, and recent orders render from `/admin/dashboard`, `/admin/revenue`, `/admin/orders` |
| DASH-002 | P2 | Loading skeleton | Throttle API and reload dashboard | Skeleton appears until data completes |
| DASH-003 | P1 | Dashboard API failure | Force stats/revenue/recent-orders failure | Error state appears with retry; retry reloads data |
| DASH-004 | P2 | Empty recent orders | Seed no orders | Recent orders table handles empty state without layout break |
| DASH-005 | P2 | Revenue chart periods | Switch chart period if available | Chart updates with selected period and correct totals |
| DASH-006 | P2 | Data formatting | Validate currency, counts, dates | Values are formatted consistently and match backend response |

## Categories

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| CAT-001 | P1 | Category list loads hierarchy | Open Categories | Root and child categories render in tree/list form |
| CAT-002 | P2 | Category loading/error/empty states | Test slow API, failed API, empty category list | Skeleton, retryable error, and empty state display correctly |
| CAT-003 | P1 | Create root category | Add category with valid name and image, parent `None` | Category is created, success snackbar appears, returns to list, new category visible |
| CAT-004 | P1 | Create child category | Add category with valid parent | Child appears under selected parent after save |
| CAT-005 | P1 | Required create image | Try creating without image | Error snackbar asks for category image; no API create occurs |
| CAT-006 | P2 | Name validation | Use blank name and one-character name | Inline validation blocks save |
| CAT-007 | P1 | Edit category name and image | Open edit, change name and image | Category updates and list refreshes silently |
| CAT-008 | P1 | Edit category keeps image | Edit name only, do not pick image | Existing image remains unchanged |
| CAT-009 | P1 | Move category to root | Edit child category, set parent to `None` | Parent is cleared and category becomes root |
| CAT-010 | P0 | Prevent circular parent | Edit a category with children | Current category and descendants are not selectable as parent |
| CAT-011 | P1 | Delete category confirmation | Delete a category and cancel | No deletion occurs |
| CAT-012 | P1 | Delete category success | Confirm deletion for unused category | Category disappears and success feedback appears |
| CAT-013 | P1 | Delete category blocked by backend | Delete category used by products/children if backend blocks it | Error snackbar displays backend message and category remains |
| CAT-014 | P2 | Image upload validation | Try JPEG, PNG, WebP and invalid file type | Allowed types work; invalid type is blocked by picker or backend error |
| CAT-015 | P2 | Deep link edit | Open `/categories/<id>/edit` directly | Categories load, form populates, save works |

## Users

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| USER-001 | P1 | User list loads | Open Users | Users render with name/email/role/status and vendor profile where applicable |
| USER-002 | P1 | Search users | Search by name/email with debounce | Results update after debounce; clear icon resets list |
| USER-003 | P1 | Role filters | Select All, CUSTOMER, VENDOR | List resets to first page and only matching roles show |
| USER-004 | P1 | Infinite scroll | Scroll near bottom with more pages available | More users load once; footer shows loading then appended users |
| USER-005 | P2 | End of list footer | Scroll after all pages loaded | `All users loaded` appears |
| USER-006 | P1 | Pull to refresh | Pull user list down | Current list refreshes with selected filter/search context |
| USER-007 | P1 | Ban user | Click ban, confirm | Row shows action loading, user becomes banned, success state persists after refresh |
| USER-008 | P1 | Unban user | Click unban, confirm | User becomes active/unbanned |
| USER-009 | P1 | Cancel ban/unban | Open confirmation, cancel | No API mutation occurs |
| USER-010 | P2 | Ban/unban failure | Force API failure | Error snackbar appears and previous status remains |
| USER-011 | P2 | User detail navigation | Click a user row | Detail page opens with user fields and vendor profile details if present |
| USER-012 | P2 | Empty search result | Search unknown user | Empty state appears and does not show stale data |

## Vendors

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| VEND-001 | P1 | Vendor list loads | Open Vendors | Store, owner, status, commission, joined date, actions render |
| VEND-002 | P1 | Vendor search | Search by store name | Debounced results match search; clear resets |
| VEND-003 | P1 | Vendor status filters | Select All, PENDING, APPROVED, REJECTED, SUSPENDED | Correct records appear; page resets to 1 |
| VEND-004 | P1 | Pagination | Use next/previous page | Correct page and item range update; buttons disable at boundaries |
| VEND-005 | P1 | Approve pending vendor | Confirm Approve on PENDING vendor | Vendor becomes APPROVED and available actions update |
| VEND-006 | P1 | Reject pending vendor | Confirm Reject on PENDING vendor | Vendor becomes REJECTED |
| VEND-007 | P1 | Approve rejected vendor | Confirm Approve on REJECTED vendor | Vendor becomes APPROVED |
| VEND-008 | P1 | Suspend approved vendor | Confirm Suspend on APPROVED vendor | Vendor becomes SUSPENDED |
| VEND-009 | P1 | Cancel vendor action | Open confirmation, cancel | Status does not change |
| VEND-010 | P2 | Vendor action failure | Force API failure for approve/reject/suspend | Error snackbar appears; row status is unchanged |
| VEND-011 | P2 | Action button visibility | Verify actions by status | PENDING: Approve/Reject, REJECTED: Approve, APPROVED: Suspend, SUSPENDED: no invalid action |
| VEND-012 | P2 | Vendor detail | Click store name | Detail page opens for selected vendor and displays current status/details |

## Product Moderation

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| PROD-001 | P1 | Product list loads | Open Products | Product, vendor, category, price, status, rating, created date, actions render |
| PROD-002 | P1 | Product search | Search by product name | Debounced matching results appear; clear resets |
| PROD-003 | P1 | Active/inactive filters | Select All, Active, Inactive | Records match selected status |
| PROD-004 | P1 | Pagination | Move between pages | Item range and page count update correctly |
| PROD-005 | P1 | Activate inactive product | Confirm Activate | Product becomes active and action changes to Deactivate |
| PROD-006 | P1 | Deactivate active product | Confirm Deactivate | Product becomes inactive and action changes to Activate |
| PROD-007 | P1 | Delete product without orders | Confirm Delete | Product is removed and total count decreases |
| PROD-008 | P1 | Delete product with existing orders | Confirm Delete | Backend error displays; product remains |
| PROD-009 | P1 | Cancel product action | Cancel activation/deactivation/delete dialogs | No mutation occurs |
| PROD-010 | P2 | Product detail | Click product name | Detail page opens with product information |
| PROD-011 | P2 | Empty filtered result | Apply filter/search with no matches | Empty state appears without stale rows |

## Orders

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| ORD-001 | P1 | Order list loads | Open Orders | Order number, customer, status, total, date render |
| ORD-002 | P1 | Status filters | Select each status chip | Orders match selected status and page resets |
| ORD-003 | P1 | Date range filter | Select a valid date range | Orders are filtered by UTC start/end query and label updates |
| ORD-004 | P2 | Clear date range | Apply date range then clear | All-date results return and label resets |
| ORD-005 | P1 | Combined status and date filter | Apply status then date range | Results satisfy both filters |
| ORD-006 | P1 | Pagination with filters | Page through filtered results | Query preserves status/date filters |
| ORD-007 | P2 | Date range boundary | Select same-day range | Orders from that day are included according to backend date handling |
| ORD-008 | P2 | Empty order result | Use filter with no orders | Empty state appears |
| ORD-009 | P1 | Order detail | Click order number | Detail page opens for correct order |
| ORD-010 | P2 | Transient list fetch error | Force failure while changing filter/page | Existing rows remain and snackbar shows error |

## Finance

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| FIN-001 | P1 | Finance page loads | Open Finance | Revenue chart, summary tiles, and commission settings render |
| FIN-002 | P1 | Revenue period switch | Switch day/week/month | Chart reloads and selected period is reflected |
| FIN-003 | P1 | Custom date range | Pick valid range | Revenue reloads for range and date label updates |
| FIN-004 | P2 | Clear date range | Clear selected date range | Revenue reloads without start/end dates |
| FIN-005 | P1 | Edit commission valid value | Enter value between 0 and 100, save | Commission updates and success snackbar appears |
| FIN-006 | P1 | Commission validation | Enter blank, text, negative, over 100 | Dialog shows validation and does not submit |
| FIN-007 | P1 | Commission save failure | Force PATCH failure | Error snackbar appears and previous rate remains |
| FIN-008 | P2 | Revenue fetch failure | Force `/admin/revenue` failure after page loaded | Existing commission remains, revenue error snackbar appears |
| FIN-009 | P2 | Pull to refresh | Pull finance page | Revenue and commission refresh |

## Banners

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| BAN-001 | P1 | Banner list loads | Open Banners | Banner image/title/link/position/status/actions render |
| BAN-002 | P1 | Active filter | Select All, Active, Inactive | Matching banners show |
| BAN-003 | P1 | Create banner | Add title, image, optional link, position, active state | Banner is created and visible in list |
| BAN-004 | P1 | Required create image | Try create without image | Error snackbar asks for banner image |
| BAN-005 | P2 | Title validation | Blank or one-character title | Inline validation blocks save |
| BAN-006 | P2 | Link URL validation | Enter invalid URL, then valid `http/https` URL | Invalid URL is blocked; valid URL saves |
| BAN-007 | P2 | Position validation | Enter non-integer position | Inline validation blocks save |
| BAN-008 | P1 | Edit without image change | Change title/link/position/status only | Existing image is retained |
| BAN-009 | P1 | Replace image | Edit and pick new image | Banner image updates |
| BAN-010 | P1 | Clear existing link URL | Edit banner with link, clear link, save | Link is removed after reload |
| BAN-011 | P1 | Delete banner | Confirm delete | Banner disappears and success snackbar appears |
| BAN-012 | P1 | Cancel delete | Cancel confirmation | Banner remains |
| BAN-013 | P2 | Preview image | Open preview action if available | Preview dialog shows correct image and title |
| BAN-014 | P2 | Deep link edit | Open `/banners/<id>/edit` directly | Form loads existing banner or returns with clear error if load fails |

## Promo Codes

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| PROMO-001 | P1 | Promo list loads | Open Promos | Code, type, value, constraints, active status, actions render |
| PROMO-002 | P1 | Search promos | Search by code | Results update after debounce; clear resets |
| PROMO-003 | P1 | Filter active/inactive and type | Apply status/type filters if exposed | Results match filters and pagination resets |
| PROMO-004 | P1 | Create percentage promo | Code, PERCENTAGE, value `10`, optional constraints | Promo saves uppercase code and appears in list |
| PROMO-005 | P1 | Create fixed promo | Code, FIXED, fixed value, min order, active toggle | Promo saves with fixed amount |
| PROMO-006 | P1 | Code validation | Blank, under 3 chars, over 30 chars | Inline validation blocks save |
| PROMO-007 | P1 | Discount validation | Blank, text, zero, negative, percentage above 100 | Inline validation blocks save |
| PROMO-008 | P2 | Optional numeric validation | Invalid min/max discount and non-positive usage/per-user limits | Inline validation blocks save |
| PROMO-009 | P1 | Expiry date | Pick future expiry date | Date appears in form and saves |
| PROMO-010 | P1 | Clear expiry on edit | Edit promo with expiry, clear date, save | Expiry is removed after reload |
| PROMO-011 | P1 | Clear optional constraints | Edit promo and clear min/max/limits | Cleared fields persist as null |
| PROMO-012 | P1 | Duplicate promo code | Create with existing code | Backend error appears; no duplicate row is created |
| PROMO-013 | P1 | Delete promo | Confirm delete | Promo is removed |
| PROMO-014 | P1 | Cancel delete | Cancel confirmation | Promo remains |
| PROMO-015 | P2 | Deep link edit | Open `/promos/<id>/edit` directly | Form loads existing promo or returns with clear error if load fails |

## Network And API Resilience

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NET-001 | P1 | Slow network | Throttle network for every major list | Skeleton or refreshing overlay appears; buttons do not double-submit |
| NET-002 | P1 | Offline startup | Start app with API unavailable | Login/list pages show actionable error, no crash |
| NET-003 | P1 | Malformed response | Return missing `data`, `items`, or `meta` | App shows friendly error state/snackbar |
| NET-004 | P1 | 401 from any endpoint | Return 401 for list/mutation | App logs out and redirects to login |
| NET-005 | P2 | 403 unauthorized admin action | Return 403 on mutation | Error snackbar appears and UI state is not optimistically corrupted |
| NET-006 | P2 | 404 detail/edit | Open deleted record detail/edit | App shows error state or returns to list with feedback |
| NET-007 | P1 | Duplicate rapid clicks | Double-click save/action buttons | Only one mutation is submitted or duplicate requests are safely handled |
| NET-008 | P2 | Refresh while filtering | Pull refresh after applying filters/search | Request preserves or intentionally clears filters according to module behavior; no stale mixed data |

## Security And Authorization

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| SEC-001 | P0 | Customer/vendor cannot access admin app | Attempt login with non-admin roles | Blocked before token persistence |
| SEC-002 | P0 | Protected API calls require bearer token | Remove token and call any module | Redirect to login on 401 |
| SEC-003 | P0 | Banned admin session | Ban current admin externally, then refresh/use app | Access is denied according to backend rules and session is invalidated |
| SEC-004 | P1 | XSS-like text data | Seed names/titles/codes with `<script>` and HTML | Text displays safely as text, no script execution |
| SEC-005 | P1 | File upload restrictions | Try oversized image, renamed executable, unsupported MIME | Upload is rejected by picker/backend and error is shown |
| SEC-006 | P1 | Role escalation via UI | Inspect app for hidden admin-only mutation access from non-admin token | Backend rejects and app handles error |

## Accessibility And Usability

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| A11Y-001 | P2 | Keyboard navigation | Tab through login, forms, sidebar, dialogs | Focus order is logical and all controls are reachable |
| A11Y-002 | P2 | Dialog focus | Open confirmation/edit dialogs | Focus enters dialog; cancel/save are reachable; escape/back closes if platform supports it |
| A11Y-003 | P2 | Screen reader labels | Inspect icon-only controls such as logout, clear, pagination | Tooltip/semantics identify the action |
| A11Y-004 | P2 | Color contrast | Check status badges, chips, error/success snackbars | Text meets readable contrast |
| A11Y-005 | P2 | Text scaling | Test 125%, 150%, 200% text scale | Forms and tables remain usable without critical clipping |
| A11Y-006 | P2 | Date picker usability | Use keyboard/mouse to select date range | Selection, clear, and labels are understandable |

## Cross-Platform And Layout

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| UI-001 | P2 | Web desktop | Test Chrome/Safari/Firefox at common desktop widths | Tables horizontally scroll where needed and shell remains stable |
| UI-002 | P2 | Tablet/narrow width | Resize to narrow width | No overlapping action buttons, filters wrap cleanly |
| UI-003 | P2 | Long content | Seed very long names, emails, URLs, codes | Text truncates/wraps without breaking rows or forms |
| UI-004 | P3 | Empty states consistency | Force empty data in each module | Empty states use correct copy and spacing |
| UI-005 | P3 | Snackbar behavior | Trigger multiple errors quickly | Snackbars do not stack indefinitely or hide critical UI |

## Regression Smoke Suite

Run this after every admin panel change:

1. Login with admin and verify dashboard loads.
2. Navigate through every sidebar destination.
3. Validate one list load, one filter/search, and one refresh in Users, Vendors, Products, Orders, Banners, and Promos.
4. Create, edit, and delete one category.
5. Create, edit, and delete one banner.
6. Create, edit, and delete one promo code.
7. Approve/reject/suspend vendor status transitions with confirmation dialogs.
8. Activate/deactivate product and verify delete behavior.
9. Open one order detail, product detail, vendor detail, and user detail.
10. Change finance period, apply/clear date range, and edit commission with a valid value.
11. Trigger a forced 401 and confirm logout redirect.
12. Logout manually and verify protected routes redirect to login.

## Automation Recommendations

- Add widget tests for validation-heavy forms: login, category form, banner form, promo form, commission dialog.
- Add cubit unit tests for list state transitions: load, search, filter, pagination, mutation success/failure.
- Add repository tests with mocked Dio for response parsing and malformed payload handling.
- Add golden or screenshot tests for core pages at desktop and tablet widths.
- Add backend-integrated smoke tests for role access, route guard behavior, and destructive mutations.

## High-Risk Areas To Prioritize

- Auth token restoration, 401 interceptor logout, and non-admin rejection.
- Shared lazy singleton cubits across list/detail/create/edit routes.
- Mutations that optimistically update rows: vendor status, product status/delete, user ban/unban.
- Optional field clearing: category parent, banner link URL, promo constraints and expiry date.
- Image upload behavior on web and native platforms.
- Filter/search/pagination combinations preserving the correct query state.
- Detail/edit deep links when the backing list has not been loaded yet.

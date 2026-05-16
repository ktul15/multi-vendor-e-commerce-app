# Test Scenarios — Multi-Vendor E-Commerce App

A comprehensive reference for manually verifying the entire application. Covers all backend API endpoints and Flutter storefront flows — happy paths, edge cases, and complex real-world scenarios.

**Base URL (backend):** `http://localhost:5000/api/v1`
**Flutter app:** Run via `flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Categories](#2-categories)
3. [Products](#3-products)
4. [Cart](#4-cart)
5. [Addresses](#5-addresses)
6. [Orders](#6-orders)
7. [Payments](#7-payments)
8. [Reviews](#8-reviews)
9. [Wishlist](#9-wishlist)
10. [Notifications](#10-notifications)
11. [Promo Codes](#11-promo-codes)
12. [Vendor Profile](#12-vendor-profile)
13. [Vendor Payouts & Analytics](#13-vendor-payouts--analytics)
14. [Banners](#14-banners)
15. [Admin Endpoints](#15-admin-endpoints)
16. [Cross-Cutting Concerns](#16-cross-cutting-concerns)
17. [Flutter UI/UX End-to-End Flows](#17-flutter-uiux-end-to-end-flows)

---

## 1. Authentication

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 1.1 | Register as CUSTOMER | `POST /auth/register` `{name, email, password}` | 201, `{accessToken, refreshToken, user}` |
| 1.2 | Register as VENDOR | `POST /auth/register` `{name, email, password, role:"VENDOR", storeName:"Shop"}` | 201, VendorProfile created with `status: PENDING` |
| 1.3 | Login with correct credentials | `POST /auth/login` `{email, password}` | 200, tokens returned |
| 1.4 | Refresh access token | `POST /auth/refresh` `{refreshToken}` (valid, not blacklisted) | 200, new `accessToken` |
| 1.5 | Logout | `POST /auth/logout` `{refreshToken}` | 200, token added to Redis blacklist |
| 1.6 | Get profile | `GET /auth/profile` with valid Bearer | 200, `{userId, name, email, role}` |
| 1.7 | Auto-login on app start | Tokens in secure storage, open Flutter app | `getProfile` called, goes directly to HomePage |

### Edge Cases / Validation

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 1.8 | Duplicate email | `POST /auth/register` with existing email | 409 Conflict |
| 1.9 | Password too short | `POST /auth/register` `{password: "abc"}` | 400, field error on `password` |
| 1.10 | Invalid email format | `POST /auth/register` `{email: "notanemail"}` | 400, field error on `email` |
| 1.11 | Wrong password | `POST /auth/login` correct email, wrong password | 401 Unauthorized |
| 1.12 | Non-existent email | `POST /auth/login` unknown email | 401 Unauthorized |
| 1.13 | Expired refresh token | `POST /auth/refresh` with expired token | 401 Unauthorized |
| 1.14 | Blacklisted refresh token | Use refresh token after `POST /auth/logout` | 401 Unauthorized |
| 1.15 | Expired access token | `GET /auth/profile` with expired Bearer | 401 Unauthorized |
| 1.16 | No Authorization header | `GET /auth/profile` no header | 401 Unauthorized |
| 1.17 | Malformed token | `GET /auth/profile` `Bearer notavalidtoken` | 401 Unauthorized |
| 1.18 | VENDOR register without storeName | `POST /auth/register` `{role:"VENDOR"}` no `storeName` | 400, validation error |
| 1.19 | Auth rate limit (production) | 11th `POST /auth/login` within 15 min | 429 Too Many Requests |
| 1.20 | Flutter: unauthenticated → protected route | Navigate to `/cart` while logged out | Redirected to `/login` |
| 1.21 | Flutter: expired token on startup | Stored tokens but getProfile fails (expired) | Redirected to `/login` |
| 1.22 | Flutter: splash fallback | Auth check hangs for > 5 seconds | Splash removed automatically |

---

## 2. Categories

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 2.1 | List categories (public) | `GET /categories` | 200, full tree with parent + children |
| 2.2 | Create top-level category | `POST /categories` (ADMIN token) `{name, image?}` | 201, category object |
| 2.3 | Create subcategory | `POST /categories` (ADMIN) `{name, parentId}` | 201, linked to parent |
| 2.4 | Update category | `PUT /categories/:id` (ADMIN) `{name?, image?}` | 200, updated category |
| 2.5 | Delete category | `DELETE /categories/:id` (ADMIN) | 200 |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 2.6 | Create as VENDOR | `POST /categories` (VENDOR token) | 403 Forbidden |
| 2.7 | Create as CUSTOMER | `POST /categories` (CUSTOMER token) | 403 Forbidden |
| 2.8 | Update non-existent category | `PUT /categories/nonexistent-id` (ADMIN) | 404 Not Found |
| 2.9 | Delete category with products | `DELETE /categories/:id` (ADMIN) where products exist | Verify: cascade deletes or 400 conflict |
| 2.10 | Get categories — no auth needed | `GET /categories` with no token | 200 (public route) |

---

## 3. Products

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 3.1 | Create product (APPROVED VENDOR) | `POST /products` with all required fields + variants | 201, product with variants |
| 3.2 | List products (public) | `GET /products` | 200, paginated list (default 20/page) |
| 3.3 | Get single product (public) | `GET /products/:id` | 200, full product with variants |
| 3.4 | Update own product | `PUT /products/:id` (owning VENDOR) | 200, updated product |
| 3.5 | Delete own product | `DELETE /products/:id` (owning VENDOR) | 200 |
| 3.6 | Add variant to product | `POST /products/:id/variants` (owning VENDOR) `{sku, size, color, price, stock}` | 201, variant |
| 3.7 | Update variant | `PUT /products/:id/variants/:vid` (owning VENDOR) | 200 |

### Filters & Sorting

| # | Scenario | Query Params | Expected |
|---|----------|-------------|----------|
| 3.8 | Filter by category | `?categoryId=<id>` | Products in that category only |
| 3.9 | Filter by vendor | `?vendorId=<id>` | Products from that vendor only |
| 3.10 | Filter by price range | `?minPrice=10&maxPrice=50` | Products with basePrice in [10, 50] |
| 3.11 | Filter by rating | `?rating=4` | Products with `avgRating >= 4` |
| 3.12 | Filter in-stock only | `?inStock=true` | Only products with stock > 0 in at least one variant |
| 3.13 | Sort by newest | `?sort=newest` | Descending `createdAt` |
| 3.14 | Sort by price ascending | `?sort=price_asc` | Ascending price |
| 3.15 | Sort by price descending | `?sort=price_desc` | Descending price |
| 3.16 | Sort by rating | `?sort=rating` | Descending `avgRating` |
| 3.17 | Sort by popular | `?sort=popular` | Descending `reviewCount` |
| 3.18 | Pagination page 2 | `?page=2&limit=10` | Items 11–20, correct `total`/`page` in response |
| 3.19 | Combined filters | `?categoryId=X&minPrice=20&inStock=true&sort=rating` | Correct intersection |
| 3.20 | Search by keyword | `GET /products/search?q=shoes` | 200, matching products |

### Edge Cases / Authorization

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 3.21 | Create as PENDING VENDOR | `POST /products` (PENDING VENDOR token) | 403 Forbidden |
| 3.22 | Create as CUSTOMER | `POST /products` (CUSTOMER token) | 403 Forbidden |
| 3.23 | Update another vendor's product | `PUT /products/:id` (different VENDOR) | 403 Forbidden (ownership check) |
| 3.24 | Delete another vendor's product | `DELETE /products/:id` (different VENDOR) | 403 Forbidden |
| 3.25 | Duplicate SKU on variant add | `POST /products/:id/variants` with existing SKU | 409 Conflict |
| 3.26 | >5 images | `POST /products` `{images: [url1,...url6]}` | 400 validation error |
| 3.27 | Get non-existent product | `GET /products/nonexistent-id` | 404 Not Found |
| 3.28 | Search with empty q | `GET /products/search?q=` | 400 validation error |
| 3.29 | ADMIN deactivates vendor's product | `PATCH /admin/products/:id/deactivate` (ADMIN) | 200, `isActive: false` |

---

## 4. Cart

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 4.1 | Get cart | `GET /cart` (authenticated) | 200, cart with items and computed total |
| 4.2 | Add item | `POST /cart/items` `{variantId, quantity: 2}` | 201, item in cart |
| 4.3 | Add same variant again | `POST /cart/items` same `variantId` again | Quantity merged (e.g., 2+1 = 3) |
| 4.4 | Update item quantity | `PUT /cart/items/:itemId` `{quantity: 5}` | 200, quantity updated |
| 4.5 | Remove item | `DELETE /cart/items/:itemId` | 200, item removed |
| 4.6 | Clear cart | `DELETE /cart` | 200, cart is empty |
| 4.7 | Preview valid promo | `POST /cart/preview-promo` `{code: "SAVE10"}` (valid code) | 200, `{originalTotal, discount, finalTotal}` |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 4.8 | Add item with quantity 0 | `POST /cart/items` `{quantity: 0}` | 400 validation error |
| 4.9 | Add item with negative quantity | `POST /cart/items` `{quantity: -1}` | 400 validation error |
| 4.10 | Update to quantity 0 | `PUT /cart/items/:itemId` `{quantity: 0}` | Validate: 400 or auto-delete |
| 4.11 | Remove non-existent item | `DELETE /cart/items/nonexistent` | 404 Not Found |
| 4.12 | Add non-existent variant | `POST /cart/items` `{variantId: "fake"}` | 404 Not Found |
| 4.13 | Preview expired promo | `POST /cart/preview-promo` `{code: "EXPIRED"}` | 400 with descriptive message |
| 4.14 | Preview promo below minOrderValue | Cart total $5, promo requires $20 minimum | 400 with reason |
| 4.15 | Preview promo at usageLimit | Code already fully used | 400 with reason |
| 4.16 | Cart ops unauthenticated | Any cart endpoint, no token | 401 Unauthorized |

---

## 5. Addresses

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 5.1 | Create first address | `POST /addresses` (CUSTOMER) | 201, `isDefault: true` (auto) |
| 5.2 | Create second with `isDefault: true` | `POST /addresses` `{isDefault: true}` | 201, old address cleared, new is default |
| 5.3 | Create second with `isDefault: false` | `POST /addresses` `{isDefault: false}` | 201, original address remains default |
| 5.4 | List addresses | `GET /addresses` (CUSTOMER) | 200, all user addresses |
| 5.5 | Get single address | `GET /addresses/:id` | 200, correct address |
| 5.6 | Update address | `PUT /addresses/:id` `{city: "New City"}` | 200 |
| 5.7 | Set default | `PATCH /addresses/:id/default` | 200, others cleared |
| 5.8 | Delete non-default address | `DELETE /addresses/:id` | 204 |
| 5.9 | Delete default address | `DELETE /addresses/:id` where `isDefault: true` | 400, default address remains |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 5.10 | zipCode too short | `{zipCode: "AB"}` (2 chars) | 400 validation error |
| 5.11 | Country not 2 chars | `{country: "USA"}` | 400 validation error |
| 5.12 | Phone too short | `{phone: "12345"}` (5 chars) | 400 validation error |
| 5.13 | Get another user's address | `GET /addresses/:id` (different user's id) | 404 Not Found |
| 5.14 | Update another user's address | `PUT /addresses/:id` (different user) | 404 Not Found |
| 5.15 | Delete address tied to a completed order | `DELETE /addresses/:id` | 400/409 (Prisma Restrict constraint) |
| 5.16 | Unauthenticated access | Any address endpoint, no token | 401 Unauthorized |

---

## 6. Orders

### Customer Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 6.1 | Create order (no promo) | `POST /orders` `{addressId}` with items in cart | 201, order with VendorOrders split by vendor, address snapshot stored |
| 6.2 | Create order with promo | `POST /orders` `{addressId, promoCode: "SAVE10"}` | 201, discount applied, promoUsage created |
| 6.3 | Create order with notes | `POST /orders` `{addressId, notes: "Leave at door"}` | 201, notes stored |
| 6.4 | List own orders | `GET /orders` (CUSTOMER) | 200, paginated list |
| 6.5 | Filter by status | `GET /orders?status=PENDING` | Only PENDING orders |
| 6.6 | Get order detail | `GET /orders/:id` (CUSTOMER, own order) | 200, full detail with items, vendorOrders, address snapshot |
| 6.7 | Cancel PENDING order | `PUT /orders/:id/cancel` (CUSTOMER) | 200, status = CANCELLED |
| 6.8 | Cancel CONFIRMED order | `PUT /orders/:id/cancel` (CUSTOMER) | 200, status = CANCELLED |

### Vendor Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 6.9 | List own vendor orders | `GET /orders/vendor` (APPROVED VENDOR) | 200, only orders containing vendor's products |
| 6.10 | Confirm order | `PUT /orders/vendor/:id/status` `{status: "CONFIRMED"}` | 200 |
| 6.11 | Move to PROCESSING | `PUT /orders/vendor/:id/status` `{status: "PROCESSING"}` | 200 |
| 6.12 | Ship with tracking | `PUT /orders/vendor/:id/status` `{status: "SHIPPED", trackingNumber: "TRK123", trackingCarrier: "FedEx"}` | 200 |
| 6.13 | Mark DELIVERED | `PUT /orders/vendor/:id/status` `{status: "DELIVERED"}` | 200 |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 6.14 | Create order with empty cart | `POST /orders` with no cart items | 400 |
| 6.15 | Create with invalid addressId | `POST /orders` `{addressId: "fake"}` | 404 Not Found |
| 6.16 | Create with another user's address | `POST /orders` with address not owned by user | 403 Forbidden |
| 6.17 | Create with expired promo | `POST /orders` `{promoCode: "OLDCODE"}` | 400 |
| 6.18 | Create below promo minOrderValue | Cart $5, promo min $50 | 400 |
| 6.19 | Create exceeding perUserLimit | User already used promo `perUserLimit` times | 400 |
| 6.20 | Create exceeding global usageLimit | Promo `usageCount >= usageLimit` | 400 |
| 6.21 | Cancel PROCESSING order | `PUT /orders/:id/cancel` when status = PROCESSING | 400 (cannot cancel) |
| 6.22 | Cancel SHIPPED order | `PUT /orders/:id/cancel` when status = SHIPPED | 400 |
| 6.23 | Cancel DELIVERED order | `PUT /orders/:id/cancel` when status = DELIVERED | 400 |
| 6.24 | Get another customer's order | `GET /orders/:id` (different CUSTOMER) | 404 Not Found |
| 6.25 | Vendor updates another vendor's order | `PUT /orders/vendor/:id/status` (different vendor) | 403 Forbidden |
| 6.26 | Status regression | `PUT /orders/vendor/:id/status` `{status: "CONFIRMED"}` when already SHIPPED | 400 invalid transition |
| 6.27 | Race condition: promo at limit | Two simultaneous orders with promo at `usageLimit - 1` | Only one succeeds; second gets 400 |

---

## 7. Payments

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 7.1 | Create PaymentIntent | `POST /payments/create-intent` (CUSTOMER) `{orderId}` | 201, `{clientSecret}` |
| 7.2 | Stripe webhook: payment succeeded | `POST /payments/webhook` (Stripe-signed, `payment_intent.succeeded`) | 200, Payment status = SUCCEEDED, VendorEarning created |
| 7.3 | Commission deducted correctly | VendorEarning = grossAmount - (grossAmount × commissionRate / 100) | Verify VendorEarning.netAmount |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 7.4 | PaymentIntent for non-existent order | `POST /payments/create-intent` `{orderId: "fake"}` | 404 Not Found |
| 7.5 | PaymentIntent for another user's order | `POST /payments/create-intent` (different CUSTOMER) | 403 Forbidden |
| 7.6 | PaymentIntent for already-paid order | `POST /payments/create-intent` on SUCCEEDED payment | 409 Conflict |
| 7.7 | Webhook invalid signature | `POST /payments/webhook` without valid Stripe signature | 400 Rejected |
| 7.8 | Webhook: payment failed | `payment_intent.payment_failed` event | Payment status = FAILED |
| 7.9 | Webhook under high load | Simulate 150+ req/15min hitting webhook | 200 OK (not rate-limited — mounted before globalLimiter) |

---

## 8. Reviews

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 8.1 | Create review | `POST /reviews` `{productId, rating: 4, comment: "Great!"}` | 201, product `avgRating` and `reviewCount` updated |
| 8.2 | Get product reviews (public) | `GET /reviews/product/:productId` | 200, paginated reviews |
| 8.3 | Filter by rating | `GET /reviews/product/:productId?rating=5` | Only 5-star reviews |
| 8.4 | Sort by newest | `?sort=newest` | Most recent first |
| 8.5 | Sort by oldest | `?sort=oldest` | Oldest first |
| 8.6 | Sort by highest/lowest | `?sort=highest` / `?sort=lowest` | By rating descending/ascending |
| 8.7 | Update own review | `PUT /reviews/:reviewId` `{rating: 5, comment: "Updated"}` | 200, `avgRating` recalculated |
| 8.8 | Delete own review | `DELETE /reviews/:reviewId` | 200, `avgRating` and `reviewCount` recalculated |
| 8.9 | Get my reviews | `GET /reviews/my-reviews` (authenticated) | 200, user's own reviews |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 8.10 | Duplicate review | `POST /reviews` same `productId` twice | 409 Conflict |
| 8.11 | Rating = 0 | `POST /reviews` `{rating: 0}` | 400 validation error |
| 8.12 | Rating = 6 | `POST /reviews` `{rating: 6}` | 400 validation error |
| 8.13 | Comment > 1000 chars | `POST /reviews` with 1001-char comment | 400 validation error |
| 8.14 | Update another user's review | `PUT /reviews/:reviewId` (different user) | 403/404 |
| 8.15 | Delete another user's review | `DELETE /reviews/:reviewId` (different user) | 403/404 |
| 8.16 | avgRating math check | 2× 5-star + 1× 1-star = 3.67 avg | Verify correct rounding stored |
| 8.17 | Reviews for non-existent product | `GET /reviews/product/fake-id` | 200 empty list or 404 (verify behavior) |

---

## 9. Wishlist

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 9.1 | Toggle add | `POST /wishlist` `{productId}` (not in wishlist) | 200, product added |
| 9.2 | Toggle remove | `POST /wishlist` `{productId}` (already in wishlist) | 200, product removed |
| 9.3 | Get wishlist | `GET /wishlist` (CUSTOMER) | 200, paginated wishlist items |
| 9.4 | Explicit remove | `DELETE /wishlist/:productId` | 200 |
| 9.5 | Infinite scroll | `GET /wishlist?page=2&limit=10` | Next page of items |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 9.6 | Toggle non-existent product | `POST /wishlist` `{productId: "fake"}` | 404 Not Found |
| 9.7 | Two POSTs to same product | Tap toggle twice rapidly | Second call removes it (toggle behavior, idempotent) |
| 9.8 | Delete product not in wishlist | `DELETE /wishlist/:productId` (not present) | 404 or 200 (verify idempotent behavior) |
| 9.9 | Unauthenticated access | `GET /wishlist` no token | 401 Unauthorized |
| 9.10 | Flutter: wishlist resets on logout | Log out → wishlist state cleared | Product hearts show unfilled |
| 9.11 | Flutter: wishlist reloads on re-login | Log back in → `AuthAuthenticated` → wishlist loaded | Hearts restored to correct state |

---

## 10. Notifications

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 10.1 | Save FCM token | `PUT /notifications/fcm-token` `{token: "fcm-tok-xyz"}` | 200 |
| 10.2 | Remove FCM token | `DELETE /notifications/fcm-token` | 200 |
| 10.3 | Get notifications | `GET /notifications` (authenticated) | 200, paginated |
| 10.4 | Get unread count | `GET /notifications/unread-count` | 200, `{count: N}` |
| 10.5 | Mark single as read | `PUT /notifications/:id/read` | 200, `isRead: true`, count decrements |
| 10.6 | Mark all as read | `PUT /notifications/read-all` | 200, `unreadCount = 0` |
| 10.7 | Foreground push (Flutter) | Push notification received while app open | Unread count increments in real-time without page reload |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 10.8 | Save token with no body | `PUT /notifications/fcm-token` empty body | 400 validation error |
| 10.9 | Mark non-existent notification | `PUT /notifications/fake-id/read` | 404 Not Found |
| 10.10 | Mark another user's notification | `PUT /notifications/:id/read` (wrong user) | 404 Not Found |
| 10.11 | Unauthenticated access | Any notification endpoint, no token | 401 Unauthorized |

---

## 11. Promo Codes

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 11.1 | Create PERCENTAGE promo | `POST /promo-codes` (ADMIN) `{code, discountType: "PERCENTAGE", discountValue: 10}` | 201 |
| 11.2 | Create FIXED promo | `POST /promo-codes` (ADMIN) `{discountType: "FIXED", discountValue: 5}` | 201 |
| 11.3 | Create with all optional fields | `{usageLimit: 100, perUserLimit: 1, minOrderValue: 50, maxDiscount: 20, expiresAt: future}` | 201 |
| 11.4 | List promo codes | `GET /promo-codes` (ADMIN) | 200, paginated |
| 11.5 | Get promo code by ID | `GET /promo-codes/:id` (ADMIN) | 200 |
| 11.6 | Update promo code | `PUT /promo-codes/:id` (ADMIN) `{isActive: false}` | 200 |
| 11.7 | Delete promo code | `DELETE /promo-codes/:id` (ADMIN) | 200 |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 11.8 | Create as VENDOR | `POST /promo-codes` (VENDOR token) | 403 Forbidden |
| 11.9 | Duplicate code | `POST /promo-codes` with existing `code` | 409 Conflict |
| 11.10 | Past expiry date | `{expiresAt: "2020-01-01"}` | 400 validation error |
| 11.11 | usageLimit = 0 | `{usageLimit: 0}` | 400 (min 1) |
| 11.12 | PERCENTAGE > 100 | `{discountType: "PERCENTAGE", discountValue: 110}` | Verify: 400 or allowed |
| 11.13 | Deactivated promo in cart | Set `isActive: false`, then `POST /cart/preview-promo` | 400 promo not found/inactive |

---

## 12. Vendor Profile

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 12.1 | Get own profile | `GET /vendor-profile/me` (any VENDOR) | 200, `{storeName, status, description, storeLogo, storeBanner}` |
| 12.2 | Update profile (APPROVED) | `PUT /vendor-profile/me` (APPROVED VENDOR) `{storeName: "New Name"}` | 200 |
| 12.3 | Upload store logo | `PUT /vendor-profile/me` multipart with `logo` file | 200, `storeLogo` URL updated (Cloudinary) |
| 12.4 | Upload store banner | `PUT /vendor-profile/me` multipart with `banner` file | 200, `storeBanner` URL updated |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 12.5 | Get profile as CUSTOMER | `GET /vendor-profile/me` (CUSTOMER token) | 403 Forbidden |
| 12.6 | Update profile as PENDING VENDOR | `PUT /vendor-profile/me` (PENDING status) | 403 Forbidden |
| 12.7 | Update profile as REJECTED VENDOR | `PUT /vendor-profile/me` (REJECTED status) | 403 Forbidden |
| 12.8 | Update profile as SUSPENDED VENDOR | `PUT /vendor-profile/me` (SUSPENDED status) | 403 Forbidden |
| 12.9 | Upload non-image file as logo | `PUT /vendor-profile/me` with `.pdf` file | 400 (Multer validation) |

---

## 13. Vendor Payouts & Analytics

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 13.1 | Start Connect onboarding | `POST /vendor-payouts/connect/onboard` (APPROVED VENDOR) | 200, `{onboardingUrl}` |
| 13.2 | Refresh onboarding URL | `GET /vendor-payouts/connect/onboard/refresh` | 200, new URL |
| 13.3 | Get Connect status | `GET /vendor-payouts/connect/status` | 200, `{connected, chargesEnabled, payoutsEnabled}` |
| 13.4 | Revenue summary | `GET /analytics/vendor/summary` (APPROVED VENDOR) | 200, `{totalRevenue, orderCount, averageOrderValue}` |
| 13.5 | Sales time-series (day) | `GET /analytics/vendor/sales?period=day&startDate=...&endDate=...` | 200, array of `{date, revenue, orders}` |
| 13.6 | Sales time-series (week) | `?period=week` | Weekly bucketed data |
| 13.7 | Sales time-series (month) | `?period=month` | Monthly bucketed data |
| 13.8 | Top products | `GET /analytics/vendor/top-products?limit=5` | 200, ranked by revenue |
| 13.9 | Earnings list | `GET /vendor-payouts/earnings` | 200, paginated |
| 13.10 | Earnings summary | `GET /vendor-payouts/earnings/summary` | 200, `{totalEarnings, pendingBalance, transferred}` |
| 13.11 | Payouts list | `GET /vendor-payouts/payouts` | 200, paginated |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 13.12 | Analytics as PENDING VENDOR | `GET /analytics/vendor/summary` (PENDING) | 403 Forbidden |
| 13.13 | Analytics as CUSTOMER | `GET /analytics/vendor/summary` (CUSTOMER) | 403 Forbidden |
| 13.14 | startDate > endDate | `?startDate=2025-12-01&endDate=2025-01-01` | 400 validation error |
| 13.15 | Date range > 366 days | Date span exceeding 366 days | 400 validation error |
| 13.16 | top-products limit > 20 | `?limit=25` | 400 validation error |
| 13.17 | Connect webhook: account.updated | Stripe sends `account.updated` event | VendorProfile `stripeOnboardingStatus` updated |
| 13.18 | Connect webhook: payout.paid | Stripe sends `payout.paid` event | VendorPayout record status updated |

---

## 14. Banners

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 14.1 | Get active banners (public) | `GET /banners` | 200, only `isActive: true`, ordered by `position` |
| 14.2 | Create banner (ADMIN) | `POST /banners` (ADMIN) multipart `{title, image}` | 201 |
| 14.3 | Create with all fields | `{title, linkUrl, position: 2, isActive: true, image}` | 201 |
| 14.4 | List all banners (ADMIN) | `GET /banners/all` (ADMIN) | 200, includes inactive |
| 14.5 | Update banner | `PUT /banners/:id` (ADMIN) | 200 |
| 14.6 | Delete banner | `DELETE /banners/:id` (ADMIN) | 200 |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 14.7 | Create as VENDOR | `POST /banners` (VENDOR token) | 403 Forbidden |
| 14.8 | Create without image | `POST /banners` no image field | 400 validation error |
| 14.9 | Public GET returns only active | Create inactive banner, `GET /banners` | Inactive banners NOT in response |

---

## 15. Admin Endpoints

### Happy Paths

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 15.1 | Dashboard stats | `GET /admin/dashboard` (ADMIN) | 200, `{totalUsers, totalVendors, totalProducts, totalOrders, totalRevenue}` |
| 15.2 | List users | `GET /admin/users` (ADMIN) | 200, paginated |
| 15.3 | Filter users by role | `?role=VENDOR` | Only vendors |
| 15.4 | Filter banned users | `?isBanned=true` | Only banned users |
| 15.5 | Ban user | `PATCH /admin/users/:userId/ban` (ADMIN) | 200, `isBanned: true` |
| 15.6 | Unban user | `PATCH /admin/users/:userId/unban` (ADMIN) | 200, `isBanned: false` |
| 15.7 | List vendors | `GET /admin/vendors` (ADMIN) | 200, with vendor profiles |
| 15.8 | Filter by status | `?status=PENDING` | Only PENDING vendors |
| 15.9 | Approve vendor | `PATCH /admin/vendors/:id/approve` (ADMIN) | 200, status = APPROVED |
| 15.10 | Reject vendor | `PATCH /admin/vendors/:id/reject` (ADMIN) | 200, status = REJECTED |
| 15.11 | Suspend vendor | `PATCH /admin/vendors/:id/suspend` (ADMIN) | 200, status = SUSPENDED |
| 15.12 | Set vendor commission | `PATCH /admin/vendors/:id/commission` `{rate: 15}` | 200 |
| 15.13 | List all products | `GET /admin/products` (ADMIN) | 200, paginated, all vendors' products |
| 15.14 | Activate product | `PATCH /admin/products/:id/activate` | 200, `isActive: true` |
| 15.15 | Deactivate product | `PATCH /admin/products/:id/deactivate` | 200, `isActive: false` |
| 15.16 | Delete any product | `DELETE /admin/products/:id` (ADMIN) | 200 |
| 15.17 | List all orders | `GET /admin/orders` (ADMIN) | 200, all orders across all users |
| 15.18 | Filter orders by date | `?startDate=...&endDate=...` | Orders within date range |
| 15.19 | Get any order detail | `GET /admin/orders/:orderId` (ADMIN) | 200 |
| 15.20 | Revenue report | `GET /admin/revenue?period=month` | 200, time-series data |
| 15.21 | Get default commission | `GET /admin/commission` | 200, `{rate}` |
| 15.22 | Set default commission | `PATCH /admin/commission` `{rate: 12}` | 200 |

### Edge Cases

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 15.23 | Admin endpoints as CUSTOMER | Any `/admin/*` endpoint (CUSTOMER token) | 403 Forbidden |
| 15.24 | Admin endpoints as VENDOR | Any `/admin/*` endpoint (VENDOR token) | 403 Forbidden |
| 15.25 | Ban non-existent user | `PATCH /admin/users/fake-id/ban` | 404 Not Found |
| 15.26 | Approve non-existent vendor | `PATCH /admin/vendors/fake-id/approve` | 404 Not Found |
| 15.27 | Commission rate > 100 | `{rate: 110}` | 400 validation error |
| 15.28 | Commission rate < 0 | `{rate: -5}` | 400 validation error |
| 15.29 | Ban logged-in user | Ban user while they have active session | Subsequent requests return 401/403 |
| 15.30 | Deactivate product in active cart | `PATCH /admin/products/:id/deactivate` | 200 (product deactivated); verify checkout handles inactive product gracefully |

---

## 16. Cross-Cutting Concerns

### Security

| # | Scenario | How to Test | Expected |
|---|----------|------------|----------|
| 16.1 | SQL injection in search | `GET /products/search?q='; DROP TABLE users; --` | 200 or 400, database unaffected |
| 16.2 | XSS in product name | `POST /products` `{name: "<script>alert(1)</script>"}` | 201, stored as-is; verify response escapes on output |
| 16.3 | CORS — unauthorized origin | Request from `http://evil.com` | Origin rejected (no CORS headers) |
| 16.4 | CORS — allowed origin (dev) | Request from `http://localhost:3000` | Allowed |
| 16.5 | JWT tampered payload | Modify JWT claims, re-sign | 401 Unauthorized (signature fails) |
| 16.6 | JWT wrong secret | Sign token with different secret | 401 Unauthorized |
| 16.7 | Oversized request body | POST with body > 10mb | 413 Payload Too Large |
| 16.8 | Global rate limit (production) | 101st request within 15 min to any route | 429 Too Many Requests |

### Concurrency / Race Conditions

| # | Scenario | How to Test | Expected |
|---|----------|------------|----------|
| 16.9 | Promo race condition | Two simultaneous orders with promo at `usageLimit - 1` | Exactly one succeeds; atomic increment prevents double-spend |
| 16.10 | Stock race condition | Two users add last-in-stock item simultaneously | Stock correctly decremented; no negative stock |
| 16.11 | Wishlist toggle race | Two parallel toggles of same product | Final state consistent (either both add or net-zero) |
| 16.12 | Review avgRating atomicity | Create 10 reviews simultaneously for same product | `avgRating` and `reviewCount` match manual calculation |

### Error Response Format

| # | Scenario | Expected Shape |
|---|----------|---------------|
| 16.13 | Any 4xx error | `{success: false, message: "...", errors?: [{field, message}]}` |
| 16.14 | Validation error | `{success: false, message: "Validation failed", errors: [{field: "email", message: "..."}]}` |
| 16.15 | 404 error | `{success: false, message: "Resource not found"}` (descriptive) |
| 16.16 | 500 in production | `{success: false, message: "Internal server error"}` — no stack trace exposed |
| 16.17 | Health check | `GET /api/health` → `{status: "ok", timestamp, uptime, environment}` |

---

## 17. Flutter UI/UX End-to-End Flows

### Scenario A: New Customer Full Journey

> Tests the complete first-time user experience from install to completed order.

1. Install app → native splash screen shows (purple background, logo)
2. No stored tokens → `AuthBloc` emits `AuthUnauthenticated` → splash removed → `/login`
3. Tap "Create account" → navigate to `/register`
4. Fill name, email, password → tap Submit → `AuthRegisterRequested` fired
5. Registration succeeds → `AuthAuthenticated` → wishlist loaded, push notifications initialized
6. Redirected to `/` (HomePage)
7. HomePage shows: categories grid, trending products, new arrivals
8. Tap a category → `/products?categoryId=X` → ProductListPage filtered
9. Apply price filter (e.g., $10–$50) → results update, pagination resets
10. Toggle grid/list view → layout changes
11. Tap a product → `/product/:id` → ProductDetailPage
12. Select a variant (e.g., size L) → price and stock update to variant values
13. Tap the heart icon → product added to wishlist (optimistic update, heart fills)
14. Tap "Add to Cart" → cart badge counter increments
15. Navigate to `/cart` → CartPage shows item with quantity
16. Increase quantity to 2 → `PUT /cart/items/:itemId` `{quantity: 2}` → total updates
17. Type promo code → `POST /cart/preview-promo` → discounted total shown inline
18. Tap "Proceed to Checkout" → navigate to `/checkout`
19. No saved addresses → "Add new address" form shown
20. Fill address fields → save → address appears in list, selected
21. Tap "Continue to Summary" → CheckoutSummaryStep: shows items, promo discount, total
22. Tap "Pay Now" → `POST /orders` → `POST /payments/create-intent` → Stripe payment sheet
23. Complete payment in Stripe UI → payment succeeds
24. Navigate to `/checkout/success` (CheckoutSuccessPage) → order details shown
25. Cart auto-refreshed (fire-and-forget)
26. Navigate to `/orders` → order appears with `PENDING` status
27. Tap order → `/orders/:id` → OrderDetailPage with full line items, address snapshot
28. Navigate to `/notifications` → push notification about order received
29. Navigate to `/settings` → change to dark theme → app reloads in dark mode
30. Tap "Logout" → tokens cleared → wishlist/cart/notifications reset → `/login`

---

### Scenario B: Returning Customer with Session Resumption

> Tests auto-login, wishlist restoration, and saved address flow.

1. Reopen app → access token in secure storage
2. `AuthBloc.AuthCheckRequested` → `GET /auth/profile` succeeds → `AuthAuthenticated`
3. Splash removed, go directly to HomePage (no login screen)
4. WishlistCubit auto-loads → product hearts restored from previous session
5. Navigate to `/search` → recent searches shown from local storage
6. Type "blue sneakers" → 500ms debounce → `GET /products/search?q=blue+sneakers`
7. Results appear; tap a product
8. Heart icon shows filled (product was in wishlist)
9. Add to cart → proceed to `/checkout`
10. Address step: default address pre-selected
11. Continue to summary → proceed to payment → success
12. Navigate to `/orders/:id` → tap "Cancel Order" (order is PENDING)
13. Confirm cancellation → `PUT /orders/:id/cancel` → status = CANCELLED
14. Order list updates to reflect CANCELLED

---

### Scenario C: Network Failure Recovery in Cart

> Tests optimistic update rollback.

1. Cart has 2 items
2. Tap "Remove" on item 1 → UI optimistically removes item (shows 1 item)
3. Network fails → API call returns error
4. CartCubit reverts to `previousCart` → item 1 reappears
5. Error message shown inline
6. Network restores → retry remove → succeeds

---

### Scenario D: Promo Code UX Edge Cases

> Tests inline promo error handling.

1. Cart total is $40
2. Enter promo code "NOSUCHCODE" → `POST /cart/preview-promo` → 400
3. Inline error shown: "Invalid promo code" — cart total unchanged, no blocking error screen
4. Clear field → error disappears
5. Enter valid code "SAVE10" → 200 → discounted total shown (e.g., $36)
6. Navigate away and back → promo state preserved
7. Proceed to checkout → promo code passed to `POST /orders`

---

### Scenario E: Search Debounce and Stale Result Prevention

> Tests that rapid typing doesn't show stale results.

1. Navigate to `/search`
2. Type "red s" quickly → debounce timer starts
3. Before 500ms, type more: "red shoes" → timer resets
4. 500ms passes → request A fires for "red shoes"
5. Clear input and immediately type "blue boots" → generation counter increments
6. Request A arrives (for "red shoes") → discarded (generation mismatch)
7. Request B fires for "blue boots" → results shown correctly
8. Only "blue boots" results visible — no flash of "red shoes" results

---

### Scenario F: Checkout Retry Without Duplicate Order

> Tests the pending order preservation logic.

1. Cart has items, address selected
2. Proceed to payment → `POST /orders` creates order (orderId stored as `pendingOrder`)
3. `POST /payments/create-intent` → Stripe sheet opens
4. User taps "Cancel" in Stripe sheet → payment cancelled
5. CheckoutBloc reverts to `CheckoutSummaryStep` (order NOT abandoned)
6. Tap "Pay Now" again → CheckoutBloc detects `pendingOrder` → reuses orderId
7. **No duplicate order created** → same `POST /payments/create-intent` called
8. User completes payment → CheckoutSuccessPage

---

### Scenario G: Full Review Lifecycle

> Tests review creation, editing, deletion, and avgRating updates.

1. Navigate to `/product/42` → ProductDetailPage shows `avgRating: 4.2`, `reviewCount: 10`
2. Tap review count → navigate to `/product/42/reviews` → ReviewListPage
3. Filter by 5 stars → only 5-star reviews shown
4. Sort by "Oldest" → oldest review appears first
5. Tap "Write Review" → unauthenticated → redirected to `/login`
6. After login → navigate to `/product/42/review/write` (WriteReviewPage)
7. Select 3 stars, write "Average product" → tap Submit
8. `POST /reviews` → 201 → navigate back to ReviewListPage
9. New review appears; product `avgRating` updated (recalculated with new 3-star)
10. Navigate to ProductDetailPage → updated rating displayed
11. Tap "Write Review" again → edit form pre-filled (3 stars, "Average product")
12. Change to 5 stars → tap Update → `PUT /reviews/:id`
13. `avgRating` recalculated (higher now)
14. Tap Delete → confirm → `DELETE /reviews/:id` → 200
15. `avgRating` and `reviewCount` return to near-original values

---

### Scenario H: Deep Link to Product

> Tests that deep links work whether app is open or closed, with or without auth.

1. Click `storefrontapp://product/42` with app closed
2. App launches → GoRouter routes to `/product/42`
3. User is NOT authenticated → ProductDetailPage still loads (public route)
4. Tap "Add to Cart" → redirected to `/login` (auth required)
5. Log in → return to product context
6. Now authenticated → add to cart succeeds

7. Click `https://storefront.ktul15.dev/product/42` (HTTPS app link)
8. App handles the link → same ProductDetailPage loads

---

### Scenario I: Theme Persistence Across App Restarts

> Tests that theme preference survives app restarts.

1. Navigate to `/settings`
2. Select "Dark" theme → app switches to dark mode immediately
3. Force-close app
4. Reopen → ThemeCubit loads from SharedPreferences → dark mode applied before any data loads
5. Return to settings → "Dark" option shown as selected
6. Switch to "System" → app follows device setting

---

### Scenario J: Vendor Lifecycle (Backend)

> Tests the full vendor approval workflow from registration to suspension.

1. `POST /auth/register` `{role: "VENDOR", storeName: "My Shop"}` → 201, status = PENDING
2. `GET /vendor-profile/me` (VENDOR token) → 200, `status: "PENDING"`
3. `POST /products` (PENDING VENDOR) → 403 Forbidden
4. ADMIN: `GET /admin/vendors?status=PENDING` → vendor appears
5. ADMIN: `PATCH /admin/vendors/:vendorProfileId/approve` → 200, status = APPROVED
6. VENDOR: `POST /products` (APPROVED) → 201, product created
7. VENDOR: `GET /analytics/vendor/summary` → 200
8. VENDOR: `PUT /vendor-profile/me` → 200, profile updated
9. ADMIN: `PATCH /admin/vendors/:vendorProfileId/suspend` → 200, status = SUSPENDED
10. VENDOR: `POST /products` (SUSPENDED) → 403 Forbidden
11. VENDOR: `GET /analytics/vendor/summary` (SUSPENDED) → 403 Forbidden
12. ADMIN: `PATCH /admin/vendors/:vendorProfileId/approve` → re-approve → vendor restored

---

### Scenario K: Full Order Lifecycle (Backend)

> Tests the complete order flow from creation to delivery.

1. Customer has items in cart, valid address saved
2. `POST /orders` → 201, VendorOrders created (one per vendor in cart)
3. `POST /payments/create-intent` → 201, clientSecret returned
4. Stripe: `payment_intent.succeeded` webhook → Payment status = SUCCEEDED, VendorEarning created
5. VENDOR: `GET /orders/vendor` → vendor order visible with status PENDING
6. VENDOR: `PUT /orders/vendor/:id/status` `{status: "CONFIRMED"}` → 200
7. VENDOR: `PUT /orders/vendor/:id/status` `{status: "PROCESSING"}` → 200
8. VENDOR: `PUT /orders/vendor/:id/status` `{status: "SHIPPED", trackingNumber: "TRK123"}` → 200
9. VENDOR: `PUT /orders/vendor/:id/status` `{status: "DELIVERED"}` → 200
10. CUSTOMER: `GET /orders/:id` → status = DELIVERED, trackingNumber visible
11. VENDOR: `GET /vendor-payouts/earnings` → VendorEarning entry shows commission deducted
12. VENDOR: `GET /vendor-payouts/earnings/summary` → totals reflect completed order

---

*Document generated for multi-vendor-e-commerce-app — covers backend API and Flutter storefront.*

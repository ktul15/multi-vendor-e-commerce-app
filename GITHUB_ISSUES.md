# GitHub Project — Multi-Vendor E-Commerce App

> **Repo**: `ktul15/multi-vendor-e-commerce-app`
> **Board view**: Kanban — `Backlog → To Do → In Progress → In Review → Done`
> **Start date**: March 1, 2026

---

## Labels

| Label | Color | Description |
|---|---|---|
| `backend` | `#0E8A16` | Node.js / Express API work |
| `storefront` | `#0075CA` | Flutter mobile storefront |
| `vendor-dash` | `#F9D0C4` | Flutter web vendor dashboard |
| `admin-dash` | `#C5DEF5` | Flutter web admin dashboard |
| `feature` | `#A2EEEF` | New feature |
| `setup` | `#FBCA04` | Project setup / config |
| `auth` | `#E4E669` | Authentication related |
| `payments` | `#B60205` | Stripe / payment related |
| `database` | `#5319E7` | Schema / Prisma / PostgreSQL |
| `testing` | `#BFD4F2` | Tests |
| `devops` | `#D4C5F9` | CI/CD, Docker, deployment |
| `ui/ux` | `#FF69B4` | Design & styling |
| `priority:high` | `#B60205` | Must-have |
| `priority:medium` | `#FBCA04` | Should-have |
| `priority:low` | `#0E8A16` | Nice-to-have |

---

## Milestones

| # | Milestone | Deadline | Description |
|---|---|---|---|
| M1 | **Foundation** | March 14 | Project setup, auth, core infrastructure |
| M2 | **Products & Catalog** | March 28 | Product CRUD, categories, search |
| M3 | **Cart & Checkout** | April 11 | Cart, addresses, Stripe payments |
| M4 | **Orders & Tracking** | April 18 | Order management, status tracking |
| M5 | **Engagement** | April 25 | Reviews, wishlist, notifications |
| M6 | **Vendor Dashboard** | May 9 | Vendor features, Stripe Connect |
| M7 | **Admin Dashboard** | May 23 | Admin panel, platform management |
| M8 | **Polish & Launch** | June 6 | Testing, dark mode, deployment |

---

## Issues by Milestone

---

### ⚙️ M1 — Foundation (Week 1–2)

**Issue #1 — Initialize Node.js + Express + TypeScript project**
- Labels: `backend`, `setup`, `priority:high`
- Milestone: M1
```
Set up the backend project scaffold with TypeScript.

**Acceptance Criteria:**
- [ ] Express + TypeScript + ts-node-dev configured
- [ ] Folder structure: src/config, middleware, modules, utils, types
- [ ] ESLint + Prettier with TypeScript rules
- [ ] `npm run dev` starts the server on port 5000
- [ ] Health check route `GET /api/health` returns 200
- [ ] `.env.example` with all required env vars documented
- [ ] tsconfig.json with strict mode enabled
```

---

**Issue #2 — Set up PostgreSQL + Prisma ORM**
- Labels: `backend`, `database`, `setup`, `priority:high`
- Milestone: M1
```
Configure PostgreSQL with Prisma as the ORM.

**Acceptance Criteria:**
- [ ] Prisma initialized with `prisma init`
- [ ] DATABASE_URL via environment variable
- [ ] Initial `schema.prisma` with User model
- [ ] `npx prisma migrate dev` creates initial migration
- [ ] `npx prisma generate` generates typed client
- [ ] Prisma client singleton in `src/config/prisma.ts`
- [ ] Seed script for initial admin user
```

---

**Issue #3 — Create User model & Prisma schema**
- Labels: `backend`, `database`, `auth`, `priority:high`
- Milestone: M1
```
Define User in Prisma schema.

**Acceptance Criteria:**
- [ ] Fields: id (uuid), name, email (unique), password, role (enum: CUSTOMER, VENDOR, ADMIN), avatar, fcmToken, isVerified, isBanned, createdAt, updatedAt
- [ ] Role enum defined in Prisma
- [ ] Password hashing utility (bcrypt) in service layer
- [ ] Prisma migration generated and applied
```

---

**Issue #4 — Implement JWT auth middleware**
- Labels: `backend`, `auth`, `priority:high`
- Milestone: M1
```
JWT-based authentication with access + refresh tokens.

**Acceptance Criteria:**
- [ ] `generateAccessToken()` — 15min expiry
- [ ] `generateRefreshToken()` — 7d expiry
- [ ] `auth` middleware extracts & verifies Bearer token
- [ ] Attaches `req.user` with typed payload (userId, role)
- [ ] Returns 401 for invalid/expired tokens
- [ ] TypeScript interfaces for JWT payload
```

---

**Issue #5 — Implement role-based authorization middleware**
- Labels: `backend`, `auth`, `priority:high`
- Milestone: M1
```
Restrict endpoints by user role.

**Acceptance Criteria:**
- [ ] `authorize(...roles: Role[])` middleware factory
- [ ] Returns 403 if user role not in allowed list
- [ ] Works in combination with auth middleware
- [ ] Type-safe role enum usage
```

---

**Issue #6 — Build auth routes (register, login, refresh, forgot/reset password, logout)**
- Labels: `backend`, `auth`, `feature`, `priority:high`
- Milestone: M1
```
Complete authentication flow.

**Acceptance Criteria:**
- [ ] `POST /api/v1/auth/register` — create user, hash password, return tokens
- [ ] `POST /api/v1/auth/login` — validate credentials, return tokens
- [ ] `POST /api/v1/auth/refresh-token` — issue new access token
- [ ] `POST /api/v1/auth/forgot-password` — send OTP via email (store in Redis)
- [ ] `POST /api/v1/auth/reset-password` — verify OTP & update password
- [ ] `GET /api/v1/auth/me` — return current user (Prisma select)
- [ ] `PUT /api/v1/auth/me` — update profile
- [ ] `POST /api/v1/auth/logout` — invalidate refresh token
- [ ] Zod validation on all routes
```

---

**Issue #7 — Create global error handler & API response helpers**
- Labels: `backend`, `setup`, `priority:high`
- Milestone: M1
```
Standardize error handling and API responses.

**Acceptance Criteria:**
- [ ] `ApiError` class with statusCode, message, errors array
- [ ] `ApiResponse` class with statusCode, data, message
- [ ] Global error handler middleware (catches sync + async errors)
- [ ] Prisma error handler (unique constraint, not found, etc.)
- [ ] 404 handler for undefined routes
- [ ] Async handler wrapper (`asyncHandler`)
```

---

**Issue #8 — Set up request validation with Zod**
- Labels: `backend`, `setup`, `priority:medium`
- Milestone: M1
```
Centralized request validation with TypeScript inference.

**Acceptance Criteria:**
- [ ] `validate` middleware that accepts a Zod schema
- [ ] Validates `req.body`, `req.query`, `req.params`
- [ ] Returns structured 400 errors with field-level messages
- [ ] Zod schema types inferred in controllers
```

---

**Issue #9 — Configure Redis for session & OTP storage**
- Labels: `backend`, `setup`, `priority:medium`
- Milestone: M1
```
Redis integration for caching and OTP storage.

**Acceptance Criteria:**
- [ ] Redis connection in `src/config/redis.ts` (ioredis)
- [ ] Helper functions: `setOTP()`, `getOTP()`, `deleteOTP()`
- [ ] TTL-based expiry for OTPs (5 minutes)
- [ ] Used for refresh token blacklisting on logout
```

---

**Issue #10 — Set up rate limiting**
- Labels: `backend`, `setup`, `priority:medium`
- Milestone: M1
```
Rate limit auth and sensitive endpoints.

**Acceptance Criteria:**
- [ ] Rate limiter middleware using `express-rate-limit`
- [ ] Auth routes: 5 requests/15 min per IP
- [ ] General API: 100 requests/15 min per IP
- [ ] Redis store for distributed rate limiting
```

---

**Issue #11 — Initialize Storefront Flutter project (mobile)**
- Labels: `storefront`, `setup`, `priority:high`
- Milestone: M1
```
Scaffold the customer-facing Flutter mobile app.

**Acceptance Criteria:**
- [ ] `flutter create --org com.ktul15 storefront`
- [ ] Folder structure: core/, features/, shared/
- [ ] flutter_bloc + bloc added and configured
- [ ] GoRouter with initial routes
- [ ] App runs on iOS and Android
```

---

**Issue #12 — Create shared theme system (storefront)**
- Labels: `storefront`, `ui/ux`, `setup`, `priority:high`
- Milestone: M1
```
Design system with colors, typography, spacing.

**Acceptance Criteria:**
- [ ] Light and dark ThemeData defined
- [ ] Custom color palette (primary, secondary, accent, error, surface)
- [ ] Google Fonts integration (Inter or equivalent)
- [ ] Text styles (h1–h6, body, caption)
- [ ] Spacing & radius constants
```

---

**Issue #13 — Set up Dio HTTP client with interceptors (storefront)**
- Labels: `storefront`, `setup`, `priority:high`
- Milestone: M1
```
Centralized API client for storefront.

**Acceptance Criteria:**
- [ ] Dio instance with base URL config
- [ ] Auth interceptor (auto-attach JWT)
- [ ] Token refresh interceptor (auto-refresh on 401)
- [ ] Error interceptor (parse API errors into typed exceptions)
- [ ] Logging interceptor (debug mode only)
```

---

**Issue #14 — Build auth screens (storefront)**
- Labels: `storefront`, `auth`, `feature`, `ui/ux`, `priority:high`
- Milestone: M1
```
Authentication UI with Bloc integration.

**Acceptance Criteria:**
- [ ] Login screen with email/password
- [ ] Sign Up screen with name, email, password, confirm password
- [ ] Forgot Password screen (email → OTP → new password)
- [ ] Form validation (email format, min password length)
- [ ] Loading states and error snackbars
- [ ] Secure token storage (flutter_secure_storage)
- [ ] Auto-login if valid token exists
- [ ] AuthBloc with events: Login, Register, ForgotPassword, ResetPassword, Logout
```

---

**Issue #15 — Initialize Vendor Dashboard Flutter project (web)**
- Labels: `vendor-dash`, `setup`, `priority:high`
- Milestone: M1
```
Scaffold the vendor-facing Flutter web app.

**Acceptance Criteria:**
- [ ] `flutter create --org com.ktul15 --platforms web vendor_dashboard`
- [ ] Folder structure: core/, features/, shared/
- [ ] flutter_bloc configured
- [ ] GoRouter with initial routes
- [ ] Responsive sidebar layout for web
- [ ] App runs on Chrome
```

---

**Issue #16 — Initialize Admin Dashboard Flutter project (web)**
- Labels: `admin-dash`, `setup`, `priority:high`
- Milestone: M1
```
Scaffold the admin-facing Flutter web app.

**Acceptance Criteria:**
- [ ] `flutter create --org com.ktul15 --platforms web admin_dashboard`
- [ ] Folder structure: core/, features/, shared/
- [ ] flutter_bloc configured
- [ ] GoRouter with initial routes
- [ ] Responsive sidebar layout for web
- [ ] App runs on Chrome
- [ ] Admin login screen
```

---

**Issue #17 — Build vendor login screen (vendor dashboard)**
- Labels: `vendor-dash`, `auth`, `feature`, `ui/ux`, `priority:high`
- Milestone: M1
```
Vendor authentication for the web dashboard.

**Acceptance Criteria:**
- [ ] Login screen with email/password
- [ ] Only allows vendor role to proceed
- [ ] Token storage (shared_preferences for web)
- [ ] AuthBloc for vendor dashboard
- [ ] Redirect to dashboard on success
```

---

### 📦 M2 — Products & Catalog (Week 3–4)

**Issue #18 — Create Prisma schema for categories, products, variants**
- Labels: `backend`, `database`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Category: id (uuid), name, slug (unique), image, parentId (self-reference)
- [ ] Product: id, vendorId, categoryId, name, description, basePrice, images[], isActive, avgRating, reviewCount, tags[]
- [ ] Variant: id, productId, size, color, price, stock, sku (unique)
- [ ] Relations defined with proper foreign keys
- [ ] Prisma migration generated and applied
- [ ] Indexes on: categoryId, vendorId, name (for search)
```

---

**Issue #19 — Build Category CRUD API**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/categories` — list all (nested tree with subcategories)
- [ ] `POST /api/v1/categories` — create (admin only)
- [ ] `PUT /api/v1/categories/:id` — update (admin only)
- [ ] `DELETE /api/v1/categories/:id` — delete (admin only, cascade check)
- [ ] Auto-generate slug from name
- [ ] Zod validation
```

---

**Issue #20 — Build Product CRUD API**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] `POST /api/v1/products` — create product (vendor only)
- [ ] `PUT /api/v1/products/:id` — update (vendor, owner only)
- [ ] `DELETE /api/v1/products/:id` — soft delete via isActive flag
- [ ] `POST /api/v1/products/:id/variants` — add variant
- [ ] `PUT /api/v1/products/:id/variants/:vid` — update variant
- [ ] Image upload to Cloudinary (max 5 images)
- [ ] Prisma transactions for product + variants creation
```

---

**Issue #21 — Build product listing API with filters, sort & pagination**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/products` — paginated list
- [ ] Filter by: category, priceMin, priceMax, rating, vendor, inStock
- [ ] Sort by: price_asc, price_desc, newest, rating, popular
- [ ] Offset pagination (limit, page) with total count
- [ ] `GET /api/v1/products/:id` — product detail with variants & vendor info
- [ ] `GET /api/v1/products/search?q=` — full-text search on name + tags
- [ ] Prisma `where` clauses for dynamic filtering
```

---

**Issue #22 — Set up Cloudinary image upload middleware**
- Labels: `backend`, `setup`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Multer middleware for multipart file handling
- [ ] Cloudinary SDK configured
- [ ] Upload helper: accepts buffer, returns URL + publicId
- [ ] Delete helper: removes image by publicId
- [ ] File size limit (5MB) and type validation (jpg, png, webp)
```

---

**Issue #23 — Build Home screen (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Promotional banner carousel (auto-scroll)
- [ ] Category grid (icons + names, tap to navigate)
- [ ] Trending products horizontal list
- [ ] "New Arrivals" section
- [ ] Pull-to-refresh
- [ ] Skeleton loaders while fetching
- [ ] HomeCubit/HomeBloc for state management
```

---

**Issue #24 — Build Product List screen (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Grid/list toggle for product cards
- [ ] Filter bottom sheet (category, price range, rating)
- [ ] Sort dropdown (price, rating, newest)
- [ ] Infinite scroll pagination
- [ ] Product card: image, name, price, rating stars, vendor name
- [ ] ProductListBloc with infinite pagination support
```

---

**Issue #25 — Build Product Detail screen (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Image carousel with zoom
- [ ] Product name, price, description
- [ ] Variant selector (size, color) with stock status
- [ ] "Add to Cart" button (with variant selection)
- [ ] "Add to Wishlist" heart icon
- [ ] Reviews section preview (avg rating + recent 3)
- [ ] Vendor info card
```

---

**Issue #26 — Build Search screen (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:medium`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Search bar with debounced input (300ms)
- [ ] Auto-suggest dropdown
- [ ] Recent searches (local storage)
- [ ] Search results grid
- [ ] "No results" empty state
```

---

**Issue #27 — Build Category management screens (admin dashboard)**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:high`
- Milestone: M2
```
**Acceptance Criteria:**
- [ ] Category list (data table with parent/child info)
- [ ] Add/edit category form (name, parent dropdown, image upload)
- [ ] Delete category with confirmation
- [ ] Nested category tree view
```

---

### 🛒 M3 — Cart & Checkout (Week 5–6)

**Issue #28 — Create Prisma schema for cart, address, order, payment, promo codes**
- Labels: `backend`, `database`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] Cart: id, userId (unique)
- [ ] CartItem: id, cartId, productId, variantId, quantity
- [ ] Address: id, userId, label, street, city, state, zip, country, phone, isDefault
- [ ] Order: id, orderNumber (unique), customerId, addressId, status (enum), totalAmount, discount, trackingNumber
- [ ] OrderItem: id, orderId, productId, variantId, vendorId, quantity, price, itemStatus (enum)
- [ ] Payment: id, orderId (unique), stripePaymentIntentId (unique), amount, status (enum), method
- [ ] PromoCode: id, code (unique), discountType (enum), value, minOrderAmount, maxUses, usedCount, expiresAt, isActive
- [ ] All migrations generated and applied
```

---

**Issue #29 — Build Cart API**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/cart` — get cart with Prisma includes (product, variant details)
- [ ] `POST /api/v1/cart/items` — add item (create cart if not exists, upsert)
- [ ] `PUT /api/v1/cart/items/:itemId` — update quantity
- [ ] `DELETE /api/v1/cart/items/:itemId` — remove item
- [ ] `DELETE /api/v1/cart` — clear entire cart
- [ ] `POST /api/v1/cart/apply-promo` — validate & calculate discount
- [ ] Stock validation on add/update
- [ ] Prisma transactions where needed
```

---

**Issue #30 — Build Address API**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/addresses` — list user addresses
- [ ] `POST /api/v1/addresses` — add address
- [ ] `PUT /api/v1/addresses/:id` — update
- [ ] `DELETE /api/v1/addresses/:id` — delete
- [ ] Only one address can be `isDefault` per user (Prisma transaction to unset others)
```

---

**Issue #31 — Build Order creation API**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] `POST /api/v1/orders` — create from cart
- [ ] Validate stock availability for all items
- [ ] Calculate totals with promo discount if applied
- [ ] Decrement variant stock (Prisma transaction)
- [ ] Clear cart after successful order
- [ ] Generate order number (e.g., ORD-20260301-XXXX)
- [ ] Entire flow wrapped in Prisma transaction
```

---

**Issue #32 — Integrate Stripe payment (PaymentIntent + webhook)**
- Labels: `backend`, `payments`, `feature`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] `POST /api/v1/payments/create-intent` — create PaymentIntent with order amount
- [ ] Returns `clientSecret` to Flutter app
- [ ] Create Payment record in DB
- [ ] `POST /api/v1/payments/webhook` — handle Stripe events:
  - `payment_intent.succeeded` → update payment & order status
  - `payment_intent.payment_failed` → mark as failed, restore stock
- [ ] Webhook signature verification
- [ ] Idempotency handling
```

---

**Issue #33 — Build Cart screen (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] Items grouped by vendor
- [ ] Each item: image, name, variant info, quantity ± buttons, price, remove
- [ ] Cart summary: subtotal, shipping estimate, total
- [ ] Promo code input field
- [ ] "Proceed to Checkout" button
- [ ] Empty cart state with "Continue Shopping" CTA
- [ ] Swipe-to-delete on items
- [ ] CartBloc with add/remove/update/clear/applyPromo events
```

---

**Issue #34 — Build Checkout flow (storefront)**
- Labels: `storefront`, `feature`, `payments`, `ui/ux`, `priority:high`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] Step 1: Select/add delivery address
- [ ] Step 2: Order summary review
- [ ] Step 3: Stripe Payment Sheet (card input)
- [ ] Stripe Flutter SDK integration (`flutter_stripe`)
- [ ] Loading overlay during payment processing
- [ ] Success screen with order number + animation
- [ ] Error handling (declined card, network failure)
- [ ] CheckoutBloc managing the multi-step flow
```

---

**Issue #35 — Build Address management screens (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:medium`
- Milestone: M3
```
**Acceptance Criteria:**
- [ ] Address list screen (with default badge)
- [ ] Add/edit address form
- [ ] Set as default toggle
- [ ] Delete with confirmation
- [ ] Address card widget (reusable in checkout)
```

---

### 📍 M4 — Orders & Tracking (Week 7)

**Issue #36 — Build Order history & detail API**
- Labels: `backend`, `feature`, `priority:high`
- Milestone: M4
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/orders` — customer order history (paginated, Prisma orderBy)
- [ ] `GET /api/v1/orders/:id` — order detail with items, payment, address (Prisma includes)
- [ ] `PUT /api/v1/orders/:id/cancel` — cancel if status is PLACED or CONFIRMED
- [ ] Restore stock on cancellation (Prisma transaction)
- [ ] Stripe refund initiation on cancel
```

---

**Issue #37 — Build Order History screen (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:high`
- Milestone: M4
```
**Acceptance Criteria:**
- [ ] Order cards: order #, date, total, status badge, item count
- [ ] Filter tabs: All, Active, Completed, Cancelled
- [ ] Tap to navigate to order detail
- [ ] Pull-to-refresh + pagination
- [ ] OrderListBloc
```

---

**Issue #38 — Build Order Detail with status timeline (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:high`
- Milestone: M4
```
**Acceptance Criteria:**
- [ ] Status timeline: Placed → Confirmed → Shipped → Delivered
- [ ] Active step highlighted, completed steps checked
- [ ] Items list with images
- [ ] Delivery address display
- [ ] Payment info summary
- [ ] "Cancel Order" button (if cancellable)
- [ ] Tracking number with copy button
```

---

**Issue #39 — Implement push notifications (FCM)**
- Labels: `backend`, `storefront`, `feature`, `priority:medium`
- Milestone: M4
```
**Acceptance Criteria:**
- [ ] Backend: FCM integration via firebase-admin
- [ ] Backend: Notification model in Prisma (userId, title, body, type, isRead, createdAt)
- [ ] Backend: Send notification on order status change
- [ ] Backend: `GET /api/v1/notifications` — list user notifications
- [ ] Backend: `PUT /api/v1/notifications/:id/read` & `/read-all`
- [ ] Storefront: FCM setup (foreground + background handlers)
- [ ] Storefront: Save FCM token on login
- [ ] Storefront: Notification center screen with badge count
```

---

### ⭐ M5 — Engagement (Week 8)

**Issue #40 — Create Prisma schema for reviews, wishlist**
- Labels: `backend`, `database`, `priority:medium`
- Milestone: M5
```
**Acceptance Criteria:**
- [ ] Review: id, userId, productId, rating (1-5), comment, createdAt
- [ ] Unique constraint: one review per user per product
- [ ] WishlistItem: id, userId, productId, createdAt
- [ ] Unique constraint: userId + productId
- [ ] Migration generated and applied
```

---

**Issue #41 — Build Reviews API**
- Labels: `backend`, `feature`, `priority:medium`
- Milestone: M5
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/reviews/product/:productId` — paginated reviews
- [ ] `POST /api/v1/reviews/product/:productId` — add review (must have purchased)
- [ ] `PUT /api/v1/reviews/:id` — edit own review
- [ ] `DELETE /api/v1/reviews/:id` — delete own review
- [ ] Auto-update product avgRating and reviewCount (Prisma aggregate + update)
```

---

**Issue #42 — Build Wishlist API**
- Labels: `backend`, `feature`, `priority:medium`
- Milestone: M5
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/wishlist` — list with product details (Prisma include)
- [ ] `POST /api/v1/wishlist/:productId` — toggle add/remove
- [ ] `DELETE /api/v1/wishlist/:productId` — explicit remove
```

---

**Issue #43 — Build Promo Code engine**
- Labels: `backend`, `feature`, `priority:medium`
- Milestone: M5
```
**Acceptance Criteria:**
- [ ] PromoCode admin endpoints (create/update/delete — admin only)
- [ ] `POST /api/v1/cart/apply-promo` — validate code, check expiry, check usage limits
- [ ] Discount calculation (percentage or flat)
- [ ] Track usage per user (prevent re-use)
```

---

**Issue #44 — Build Reviews, Wishlist, Notifications UI (storefront)**
- Labels: `storefront`, `feature`, `ui/ux`, `priority:medium`
- Milestone: M5
```
**Acceptance Criteria:**
- [ ] Product review list with star breakdown chart
- [ ] Write/edit review screen (star picker + text input)
- [ ] Wishlist screen (product grid with "Move to Cart")
- [ ] Notification center (list with read/unread states)
- [ ] Badge count on notification bell icon
- [ ] ReviewBloc, WishlistBloc
```

---

### 🏪 M6 — Vendor Dashboard (Week 9–10)

**Issue #45 — Create VendorProfile Prisma schema**
- Labels: `backend`, `database`, `vendor-dash`, `priority:high`
- Milestone: M6
```
**Acceptance Criteria:**
- [ ] VendorProfile: id, userId (unique), storeName, storeLogo, storeBanner, description, status (enum: PENDING, APPROVED, REJECTED), stripeAccountId, bankDetails (json)
- [ ] Relation to User model
- [ ] Migration generated and applied
```

---

**Issue #46 — Build Vendor profile & store setup API**
- Labels: `backend`, `vendor-dash`, `feature`, `priority:high`
- Milestone: M6
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/vendor/profile` — get vendor profile
- [ ] `PUT /api/v1/vendor/profile` — update store info + image uploads
- [ ] Vendor registration sets status = PENDING
- [ ] Only approved vendors can access product/order endpoints
```

---

**Issue #47 — Build vendor order management API**
- Labels: `backend`, `vendor-dash`, `feature`, `priority:high`
- Milestone: M6
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/orders/vendor` — orders containing vendor's items (Prisma where on vendorId)
- [ ] `PUT /api/v1/orders/vendor/:id/status` — update item status: CONFIRMED → SHIPPED (with tracking number)
- [ ] Filter by status
- [ ] Email notification to customer on status update
```

---

**Issue #48 — Integrate Stripe Connect for vendor payouts**
- Labels: `backend`, `vendor-dash`, `payments`, `feature`, `priority:high`
- Milestone: M6
```
**Acceptance Criteria:**
- [ ] `POST /api/v1/vendor/stripe-onboard` — create Stripe Connect account, return onboarding URL
- [ ] Handle Stripe Connect webhook for account updates
- [ ] `GET /api/v1/vendor/earnings` — total sales, pending payout, commission breakdown
- [ ] `GET /api/v1/vendor/payouts` — payout history
- [ ] Platform commission deduction (configurable %)
```

---

**Issue #49 — Build vendor analytics API**
- Labels: `backend`, `vendor-dash`, `feature`, `priority:medium`
- Milestone: M6
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/vendor/analytics`:
  - Sales data (daily/weekly/monthly — Prisma groupBy)
  - Top 5 selling products
  - Total orders, total revenue
- [ ] Date range filtering
```

---

**Issue #50 — Build Vendor Dashboard screens (Flutter web)**
- Labels: `vendor-dash`, `feature`, `ui/ux`, `priority:high`
- Milestone: M6
```
**Acceptance Criteria:**
- [ ] Dashboard overview: sales summary cards, recent orders, revenue chart
- [ ] Store setup/edit screen (name, logo, banner, description)
- [ ] Product management: data table, add/edit/delete
- [ ] Product form: name, description, price, category dropdown, variant fields, image picker
- [ ] Order management: data table with status filters, update status with tracking input
- [ ] Earnings page: total sales card, pending payout, commission, chart (fl_chart)
- [ ] Sidebar navigation: Dashboard, Products, Orders, Earnings, Store Settings
- [ ] Responsive layout (sidebar collapses on smaller screens)
```

---

### 🛡️ M7 — Admin Dashboard (Week 11–12)

**Issue #51 — Build admin API endpoints**
- Labels: `backend`, `admin-dash`, `feature`, `priority:high`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] `GET /api/v1/admin/dashboard` — platform stats (total users, vendors, orders, revenue)
- [ ] `GET /api/v1/admin/users` — paginated user list with filters
- [ ] `PUT /api/v1/admin/users/:id/ban` — ban/unban user
- [ ] `GET /api/v1/admin/vendors/pending` — pending vendor applications
- [ ] `PUT /api/v1/admin/vendors/:id/approve` — approve/reject vendor
- [ ] `GET /api/v1/admin/products` — all products with moderation status
- [ ] `PUT /api/v1/admin/products/:id/moderate` — approve/flag/remove product
- [ ] `GET /api/v1/admin/orders` — all orders with filters
- [ ] `GET /api/v1/admin/finance/revenue` — revenue reports (Prisma aggregate)
- [ ] `PUT /api/v1/admin/finance/commission` — update commission rate
```

---

**Issue #52 — Build admin banner & promo code API**
- Labels: `backend`, `admin-dash`, `feature`, `priority:medium`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] Banner model in Prisma: id, title, imageUrl, linkUrl, position, isActive
- [ ] `POST /api/v1/admin/banners` — create banner
- [ ] `PUT /api/v1/admin/banners/:id` — update
- [ ] `DELETE /api/v1/admin/banners/:id` — delete
- [ ] `GET /api/v1/banners` — public endpoint for active banners (used by storefront)
- [ ] PromoCode CRUD: create, update, delete (admin only)
```

---

**Issue #53 — Build Admin Dashboard overview screen**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:high`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] Stat cards: total users, total vendors, total orders, total revenue
- [ ] Revenue chart (line chart, daily/weekly/monthly toggle)
- [ ] Recent orders table
- [ ] Pending vendor approvals count badge
- [ ] Sidebar navigation with all sections
```

---

**Issue #54 — Build User Management screens (admin dashboard)**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:high`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] Users data table: name, email, role, status, joined date
- [ ] Search and filter by role/status
- [ ] Ban/unban toggle with confirmation dialog
- [ ] User detail view
```

---

**Issue #55 — Build Vendor Approval screens (admin dashboard)**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:high`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] Pending vendors list with store details
- [ ] Approve/reject with reason input
- [ ] All vendors list (approved, rejected, pending tabs)
- [ ] Vendor detail: store info, products count, sales
```

---

**Issue #56 — Build Product Moderation screens (admin dashboard)**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:medium`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] Products data table: name, vendor, category, price, status
- [ ] Filter by status (active, flagged, removed)
- [ ] Approve/flag/remove actions
- [ ] Product detail preview
```

---

**Issue #57 — Build Order & Finance screens (admin dashboard)**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:medium`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] All orders data table with status filters
- [ ] Order detail view
- [ ] Revenue reports: total revenue, commission earned, vendor payouts
- [ ] Commission rate settings form
- [ ] Date range selector for all reports
```

---

**Issue #58 — Build Banner & Promo Code management (admin dashboard)**
- Labels: `admin-dash`, `feature`, `ui/ux`, `priority:medium`
- Milestone: M7
```
**Acceptance Criteria:**
- [ ] Banners: list, add (with image upload), edit, delete, reorder
- [ ] Promo codes: list, add (type, value, expiry, limits), edit, toggle active/inactive, delete
- [ ] Preview banner on form
```

---

### 🚀 M8 — Polish & Launch (Week 13–14)

**Issue #59 — Add skeleton loaders & empty states (all Flutter apps)**
- Labels: `storefront`, `vendor-dash`, `admin-dash`, `ui/ux`, `priority:medium`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Shimmer/skeleton loaders on all list/detail screens
- [ ] Empty state illustrations for: cart, wishlist, orders, notifications, search
- [ ] Error state with "Retry" button on API failures
- [ ] Apply to all three Flutter apps
```

---

**Issue #60 — Implement dark mode (storefront)**
- Labels: `storefront`, `ui/ux`, `priority:medium`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Dark theme matching design system
- [ ] System default / manual toggle in profile
- [ ] Persisted preference (shared_preferences)
- [ ] All screens render correctly in both modes
```

---

**Issue #61 — Write backend unit & integration tests**
- Labels: `backend`, `testing`, `priority:high`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Jest configured with TypeScript
- [ ] Unit tests for: auth service, order service, payment service
- [ ] Integration tests for: auth routes, product routes, cart routes, order routes
- [ ] Test database (separate PostgreSQL DB or Prisma mock)
- [ ] Coverage target: 70%+
- [ ] `npm test` runs all tests
```

---

**Issue #62 — Write Flutter widget & unit tests**
- Labels: `storefront`, `testing`, `priority:medium`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Unit tests for: AuthBloc, CartBloc, API client
- [ ] Widget tests for: login screen, product card, cart screen
- [ ] `flutter test` runs all tests
- [ ] Coverage target: 60%+
```

---

**Issue #63 — Docker + CI/CD setup**
- Labels: `backend`, `devops`, `priority:medium`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Backend Dockerfile (multi-stage build)
- [ ] docker-compose.yml (backend + PostgreSQL + Redis)
- [ ] GitHub Actions workflow: lint → test → build on PR
- [ ] Separate workflow for deploy on merge to main
```

---

**Issue #64 — API documentation (Swagger/OpenAPI)**
- Labels: `backend`, `priority:medium`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Swagger UI at `/api/docs`
- [ ] All endpoints documented with request/response schemas
- [ ] Auth headers documented
- [ ] Example requests included
```

---

**Issue #65 — App icon, splash screen & deep linking (storefront)**
- Labels: `storefront`, `ui/ux`, `priority:medium`
- Milestone: M8
```
**Acceptance Criteria:**
- [ ] Custom app icon (flutter_launcher_icons)
- [ ] Native splash screen (flutter_native_splash)
- [ ] Deep linking for: product detail, order detail
```

---

## Summary

| Milestone | Issues | Focus |
|---|---|---|
| M1 — Foundation | #1 – #17 | Backend setup, auth, 3 Flutter project scaffolds |
| M2 — Products & Catalog | #18 – #27 | Product CRUD, catalog UI, admin categories |
| M3 — Cart & Checkout | #28 – #35 | Cart, payments, checkout flow |
| M4 — Orders & Tracking | #36 – #39 | Order management, FCM notifications |
| M5 — Engagement | #40 – #44 | Reviews, wishlist, promo codes |
| M6 — Vendor Dashboard | #45 – #50 | Vendor features, Stripe Connect, analytics |
| M7 — Admin Dashboard | #51 – #58 | Admin panel, moderation, banners, finance |
| M8 — Polish & Launch | #59 – #65 | Testing, dark mode, CI/CD, deployment |

**Total: 65 issues across 8 milestones (~14 weeks)**

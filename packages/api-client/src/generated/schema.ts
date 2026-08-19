export interface paths {
    readonly "/addresses": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List the customer's saved addresses */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Address list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        /** Create a shipping address (Customer only) */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example New York */
                        readonly city: string;
                        /** @example US */
                        readonly country: string;
                        /** @example Jane Smith */
                        readonly fullName: string;
                        /** @default false */
                        readonly isDefault?: boolean;
                        /** @example +1-555-0100 */
                        readonly phone: string;
                        /** @example NY */
                        readonly state: string;
                        /** @example 123 Main St */
                        readonly street: string;
                        /** @example 10001 */
                        readonly zipCode: string;
                    };
                };
            };
            readonly responses: {
                /** @description Address created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — CUSTOMER role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/addresses/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get a single address by ID (Customer only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Address detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Address not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /** Update an address (Customer only) */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly city?: string;
                        readonly country?: string;
                        readonly fullName?: string;
                        readonly isDefault?: boolean;
                        readonly phone?: string;
                        readonly state?: string;
                        readonly street?: string;
                        readonly zipCode?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Address updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Address not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        /** Delete an address (Customer only) */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Address deleted */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Address not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/addresses/{id}/default": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Set an address as the default (Customer only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Default address updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Address not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/commission": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get the platform default commission rate (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Current default commission rate */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Default commission fetched",
                         *       "data": {
                         *         "rate": 10
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["CommissionSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Update the platform default commission rate (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example 10 */
                        readonly rate: number;
                    };
                };
            };
            readonly responses: {
                /** @description Commission rate updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["CommissionMutationSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/dashboard": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get admin dashboard stats
         * @description Returns platform-wide counts and platformRevenue, the platform's earned commission (not gross merchandise value).
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Dashboard stats */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Dashboard stats fetched",
                         *       "data": {
                         *         "totalUsers": 1200,
                         *         "totalVendors": 45,
                         *         "totalProducts": 320,
                         *         "totalOrders": 850,
                         *         "bannedUsers": 8,
                         *         "pendingVendors": 4,
                         *         "platformRevenue": "75000.00"
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["AdminDashboardSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/orders": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List all orders across the platform (Admin only)
         * @description Each order retains its per-vendor sub-orders and includes fulfillmentStatus. SINGLE means every sub-order has one shared status, MIXED means vendor statuses differ, and NONE indicates no sub-orders. Without vendorId, status matches an order when any sub-order has that status. With vendorId, both filters must match the same vendor sub-order.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly endDate?: string;
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Search by order number, customer name, or customer email */
                    readonly search?: string;
                    readonly startDate?: string;
                    readonly status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
                    /** @description Filter by customer ID */
                    readonly userId?: string;
                    /** @description Filter by vendor owner user-account ID (`User.id`), not the vendor-profile ID. */
                    readonly vendorId?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated order list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminOrdersSuccess"];
                    };
                };
                /** @description Invalid pagination, date range, status, customer ID, or vendor user ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/orders/{orderId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get order detail (Admin only)
         * @description Returns every vendor sub-order plus the deterministic SINGLE, MIXED, or NONE fulfillmentStatus summary.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly orderId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Full order detail including sub-orders and items */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminOrderDetailSuccess"];
                    };
                };
                /** @description Invalid order ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/products": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List all products (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly categoryId?: string;
                    readonly isActive?: boolean;
                    readonly limit?: number;
                    readonly page?: number;
                    readonly search?: string;
                    /** @description Vendor owner user-account ID (`User.id`), not the vendor-profile ID. */
                    readonly vendorId?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated product list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminProductsSuccess"];
                    };
                };
                /** @description Invalid pagination or product filter query */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/products/{productId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get complete product moderation detail (Admin only)
         * @description Includes inactive products, media URLs, tags, variants and inventory, vendor and vendor-profile identity, category, and rating aggregates.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly productId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product moderation detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminProductDetailSuccess"];
                    };
                };
                /** @description Invalid product ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        /** Delete a product (Admin only) */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly productId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product deleted; response body is empty */
                readonly 204: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid product ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product has order history and must be deactivated instead */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/products/{productId}/activate": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Activate a product (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly productId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product activated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminProductStatusMutationSuccess"];
                    };
                };
                /** @description Invalid product ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product is already active */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/products/{productId}/deactivate": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Deactivate a product (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly productId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product deactivated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminProductStatusMutationSuccess"];
                    };
                };
                /** @description Invalid product ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product is already inactive */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/revenue": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get gross merchandise value report (Admin only)
         * @description Returns date-filtered INR GMV series plus authoritative gross, platform commission, vendor earnings, earning-status, and payout totals. Failed and reversed earnings are excluded from headline totals.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly endDate?: string;
                    readonly period?: "day" | "week" | "month";
                    readonly startDate?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Revenue report time series */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminRevenueSuccess"];
                    };
                };
                /** @description Invalid report period or date range */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/users": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List all users (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly isBanned?: boolean;
                    readonly limit?: number;
                    readonly page?: number;
                    readonly role?: "CUSTOMER" | "VENDOR" | "ADMIN";
                    /** @description Search by name or email */
                    readonly search?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated user list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminUsersSuccess"];
                    };
                };
                /** @description Invalid pagination or user filter query */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/users/{userId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get a user by user ID (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description User account ID, not a vendor-profile ID. */
                    readonly userId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description User detail, including a vendor-profile summary when applicable */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminUserDetailSuccess"];
                    };
                };
                /** @description Invalid user ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description User not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/users/{userId}/ban": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Ban a user (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly userId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description User banned */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminUserBanMutationSuccess"];
                    };
                };
                /** @description Invalid user ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Admin accounts cannot be banned, or ADMIN role is required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description User not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description User is already banned */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/users/{userId}/unban": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Unban a user (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly userId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description User unbanned */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminUserBanMutationSuccess"];
                    };
                };
                /** @description Invalid user ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description User not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description User is not currently banned */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/vendors": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List vendor profiles (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Case-insensitive search by store name or owner email */
                    readonly search?: string;
                    readonly status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated vendor list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminVendorsSuccess"];
                    };
                };
                /** @description Invalid pagination or vendor filter query */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/vendors/{vendorProfileId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get a vendor by vendor-profile ID (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description VendorProfile ID. The owner user ID is returned separately as userId. */
                    readonly vendorProfileId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Vendor profile and relevant owner account detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminVendorDetailSuccess"];
                    };
                };
                /** @description Invalid vendor-profile ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/vendors/{vendorProfileId}/approve": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Approve a vendor (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly vendorProfileId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Vendor approved */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminVendorLifecycleSuccess"];
                    };
                };
                /** @description Invalid vendor-profile ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor is already approved */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/vendors/{vendorProfileId}/commission": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Set a vendor's custom commission rate (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly vendorProfileId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * @description Set null to revert to platform default
                         * @example 12
                         */
                        readonly rate: number | null;
                    };
                };
            };
            readonly responses: {
                /** @description Commission rate updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorCommissionMutationSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/vendors/{vendorProfileId}/reject": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Reject a vendor application (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly vendorProfileId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Vendor rejected */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminVendorLifecycleSuccess"];
                    };
                };
                /** @description Invalid vendor-profile ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor is already rejected or an approved vendor must be suspended instead */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/admin/vendors/{vendorProfileId}/suspend": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Suspend an approved vendor (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly vendorProfileId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Vendor suspended */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["AdminVendorLifecycleSuccess"];
                    };
                };
                /** @description Invalid vendor-profile ID, or vendor is not approved and cannot be suspended */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/analytics/vendor/sales": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get vendor sales chart data (approved Vendors only)
         * @description Returns time-series sales data grouped by day, week, or month.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly endDate?: string;
                    readonly period?: "day" | "week" | "month";
                    readonly startDate?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Sales time series */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Sales data fetched",
                         *       "data": [
                         *         {
                         *           "date": "2024-01-01",
                         *           "revenue": 250,
                         *           "orders": 3
                         *         }
                         *       ]
                         *     }
                         */
                        readonly "application/json": components["schemas"]["VendorSalesSuccess"];
                    };
                };
                /** @description Invalid date range */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/analytics/vendor/summary": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get vendor analytics summary (approved Vendors only)
         * @description Returns total revenue, order count, and average order value for the given date range (max 366 days).
         */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    /** @example 2024-12-31T23:59:59Z */
                    readonly endDate?: string;
                    /** @example 2024-01-01T00:00:00Z */
                    readonly startDate?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Analytics summary */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Analytics summary fetched",
                         *       "data": {
                         *         "totalRevenue": 12500,
                         *         "orderCount": 85,
                         *         "averageOrderValue": 147.06
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["VendorAnalyticsSummarySuccess"];
                    };
                };
                /** @description Invalid date range (max 366 days) */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — must be an approved vendor */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/analytics/vendor/top-products": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get top-selling products (approved Vendors only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly endDate?: string;
                    /** @description Number of top products to return */
                    readonly limit?: number;
                    readonly startDate?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Top products by revenue */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Top products fetched",
                         *       "data": [
                         *         {
                         *           "productId": "uuid",
                         *           "productName": "Wireless Headphones",
                         *           "revenue": 2000,
                         *           "unitsSold": 20
                         *         }
                         *       ]
                         *     }
                         */
                        readonly "application/json": components["schemas"]["VendorTopProductsSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/login": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /** Login with bearer tokens or secure web cookies */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: {
                    /** @description Set to `cookie` for a browser session. Tokens are then returned only as HttpOnly cookies. */
                    readonly "X-Auth-Mode"?: "cookie";
                };
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * Format: email
                         * @example jane@example.com
                         */
                        readonly email: string;
                        /** @example secret123 */
                        readonly password: string;
                    };
                };
            };
            readonly responses: {
                /** @description Login successful. Bearer clients receive tokens in data; cookie clients receive Set-Cookie headers and user data only. */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Login successful",
                         *       "data": {
                         *         "user": {
                         *           "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
                         *           "email": "jane@example.com",
                         *           "role": "CUSTOMER"
                         *         },
                         *         "tokens": {
                         *           "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                         *           "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                         *         }
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["LoginSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Invalid credentials */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/logout": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Logout, revoke the refresh token, and clear web cookies
         * @description Cookie clients send the HttpOnly refresh cookie. Bearer clients may pass refreshToken in JSON. Both auth cookies are always cleared.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: {
                readonly content: {
                    readonly "application/json": {
                        /** @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... */
                        readonly refreshToken?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Logged out successfully */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Logged out successfully",
                         *       "data": null
                         *     }
                         */
                        readonly "application/json": components["schemas"]["LogoutSuccess"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/profile": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get current user profile
         * @description Returns the profile of the authenticated user. Accepts a Bearer access token or the HttpOnly access cookie.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description User profile */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Profile fetched",
                         *       "data": {
                         *         "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
                         *         "name": "Jane Smith",
                         *         "email": "jane@example.com",
                         *         "role": "CUSTOMER"
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["ProfileSuccess"];
                    };
                };
                /** @description Missing or invalid access token */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/refresh": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Rotate the access and refresh tokens
         * @description Cookie clients send the HttpOnly refresh cookie. Bearer clients send refreshToken in JSON. Consumption and encrypted grace-result publication are one atomic operation. Overlapping requests receive the same replacement pair only when they present the same browser CSRF secret or opaque X-Refresh-Rotation-Key idempotency proof.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: {
                    /** @description Opaque client-session proof that binds bounded idempotent replay. Browser cookie clients use their CSRF secret automatically. */
                    readonly "X-Refresh-Rotation-Key"?: string;
                };
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: {
                readonly content: {
                    readonly "application/json": {
                        /** @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... */
                        readonly refreshToken?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Rotated token pair. Bearer clients receive tokens in data; cookie clients receive updated Set-Cookie headers and null data. */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Token refreshed",
                         *       "data": {
                         *         "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                         *         "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["RefreshSuccess"];
                    };
                };
                /** @description Missing or invalid refresh token */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Refresh token expired or blacklisted */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/register": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Register a new user
         * @description Creates a customer or vendor account. `storeName` is required when `role` is `VENDOR`.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: {
                    /** @description Set to `cookie` to return tokens only as HttpOnly cookies. */
                    readonly "X-Auth-Mode"?: "cookie";
                };
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * Format: email
                         * @example jane@example.com
                         */
                        readonly email: string;
                        /** @example Jane Smith */
                        readonly name: string;
                        /** @example secret123 */
                        readonly password: string;
                        /**
                         * @default CUSTOMER
                         * @enum {string}
                         */
                        readonly role?: "CUSTOMER" | "VENDOR";
                        /**
                         * @description Required when role is VENDOR
                         * @example Jane's Boutique
                         */
                        readonly storeName?: string;
                    };
                };
            };
            readonly responses: {
                /** @description User registered successfully */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "User registered successfully",
                         *       "data": {
                         *         "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
                         *         "email": "jane@example.com",
                         *         "role": "CUSTOMER"
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Email or normalized vendor store name already in use */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/banners": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get active banners for the storefront
         * @description Returns only active banners, ordered by position. No authentication required.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Active banners */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Banners fetched",
                         *       "data": [
                         *         {
                         *           "id": "uuid",
                         *           "title": "Summer Sale",
                         *           "imageUrl": "https://cdn.example.com/banner.jpg",
                         *           "linkUrl": "https://example.com/sale",
                         *           "position": 0
                         *         }
                         *       ]
                         *     }
                         */
                        readonly "application/json": components["schemas"]["PublicBannersSuccess"];
                    };
                };
            };
        };
        readonly put?: never;
        /**
         * Create a banner (Admin only)
         * @description Send as `multipart/form-data`. The `image` file field is required. Sending `application/json` will result in a 400 missing-image error. A successful upload is rolled back with an observable warning if the database create fails.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "multipart/form-data": {
                        /**
                         * Format: binary
                         * @description Exactly one JPEG, PNG, or WebP image up to 5 MB.
                         */
                        readonly image: Blob;
                        /** @default true */
                        readonly isActive?: boolean;
                        /**
                         * Format: uri
                         * @example https://example.com/sale
                         */
                        readonly linkUrl?: string;
                        /**
                         * @description Display order (lower = higher priority)
                         * @default 0
                         */
                        readonly position?: number;
                        /** @example Summer Sale */
                        readonly title: string;
                    };
                };
            };
            readonly responses: {
                /** @description Banner created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["BannerSuccess"];
                    };
                };
                /** @description Validation error or missing image */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Uploaded image exceeds the 5 MB limit */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/banners/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get a banner by ID (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Banner detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["BannerSuccess"];
                    };
                };
                /** @description Invalid banner ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Banner not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        /**
         * Update a banner (Admin only)
         * @description Send text-only updates as JSON or multipart. A multipart request may contain exactly one optional `image` file, including an image-only update. At least one field or image is required. New uploads roll back if the DB update fails; replaced media cleanup is observable and best effort after commit.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly isActive?: boolean;
                        /**
                         * Format: uri
                         * @description Set null to clear the link
                         */
                        readonly linkUrl?: string | null;
                        readonly position?: number;
                        readonly title?: string;
                    };
                    readonly "multipart/form-data": {
                        /**
                         * Format: binary
                         * @description Optional single JPEG, PNG, or WebP image up to 5 MB; replaces existing image
                         */
                        readonly image?: Blob;
                        readonly isActive?: boolean;
                        /** @description Send an absolute URI, or an empty string to clear the link. */
                        readonly linkUrl?: string | "";
                        readonly position?: number;
                        readonly title?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Banner updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["BannerSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Banner not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Uploaded image exceeds the 5 MB limit */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        /** Delete a banner (Admin only) */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Banner deleted; response body is empty. Media cleanup is observable and best effort after DB commit. */
                readonly 204: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid banner ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Banner not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/banners/all": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List all banners with pagination (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    /** @description Filter by active/inactive status */
                    readonly isActive?: boolean;
                    readonly limit?: number;
                    readonly page?: number;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated banner list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["BannerListSuccess"];
                    };
                };
                /** @description Invalid pagination or active-state filter */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/cart": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get the current user's cart */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Cart with items */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Cart fetched",
                         *       "data": {
                         *         "items": [
                         *           {
                         *             "id": "item-uuid",
                         *             "variantId": "variant-uuid",
                         *             "quantity": 2,
                         *             "variant": {
                         *               "sku": "SKU-BLK-M",
                         *               "price": 29.99,
                         *               "product": {
                         *                 "name": "Wireless Headphones"
                         *               }
                         *             }
                         *           }
                         *         ],
                         *         "total": 59.98
                         *       }
                         *     }
                         */
                        readonly "application/json": unknown;
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        /** Clear the entire cart */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Cart cleared */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/cart/items": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /** Add an item to the cart */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example 2 */
                        readonly quantity: number;
                        /**
                         * Format: uuid
                         * @example d290f1ee-6c54-4b01-90e6-d701748f0851
                         */
                        readonly variantId: string;
                    };
                };
            };
            readonly responses: {
                /** @description Item added to cart */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Validation error or insufficient stock */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Variant not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/cart/items/{itemId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /** Update cart item quantity */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly itemId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example 3 */
                        readonly quantity: number;
                    };
                };
            };
            readonly responses: {
                /** @description Cart item updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Cart item not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        /** Remove an item from the cart */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly itemId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Item removed */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Cart item not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/cart/preview-promo": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Preview a promo code discount on the current cart
         * @description Calculates and returns the discounted total without placing an order.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example SUMMER20 */
                        readonly code: string;
                    };
                };
            };
            readonly responses: {
                /** @description Discount preview */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Promo applied",
                         *       "data": {
                         *         "originalTotal": 100,
                         *         "discount": 20,
                         *         "finalTotal": 80
                         *       }
                         *     }
                         */
                        readonly "application/json": unknown;
                    };
                };
                /** @description Invalid or expired promo code */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/categories": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List all categories
         * @description Returns every category as a recursively nested tree with no depth truncation. No authentication required.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Category list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Categories fetched",
                         *       "data": [
                         *         {
                         *           "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
                         *           "name": "Electronics",
                         *           "image": "https://cdn.example.com/electronics.jpg",
                         *           "parentId": null,
                         *           "children": [
                         *             {
                         *               "id": "e7b2c3a4-1234-5678-abcd-ef0123456789",
                         *               "name": "Phones",
                         *               "parentId": "d290f1ee-6c54-4b01-90e6-d701748f0851"
                         *             }
                         *           ]
                         *         }
                         *       ]
                         *     }
                         */
                        readonly "application/json": components["schemas"]["CategoriesSuccess"];
                    };
                };
            };
        };
        readonly put?: never;
        /** Create a category (Admin only) */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * Format: uri
                         * @example https://cdn.example.com/accessories.jpg
                         */
                        readonly image?: string;
                        /** @example Accessories */
                        readonly name: string;
                        /**
                         * Format: uuid
                         * @description ID of the parent category (for subcategories)
                         * @example d290f1ee-6c54-4b01-90e6-d701748f0851
                         */
                        readonly parentId?: string;
                    };
                    readonly "multipart/form-data": {
                        /**
                         * Format: binary
                         * @description Optional JPEG, PNG, or WebP image up to 5 MB. A file takes precedence over an image URL.
                         */
                        readonly image?: Blob;
                        readonly name: string;
                        /** Format: uuid */
                        readonly parentId?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Category created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["CategorySuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Parent category not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Uploaded image exceeds the 5 MB limit */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/categories/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /** Update a category (Admin only) */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Category ID */
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** Format: uri */
                        readonly image?: string;
                        /** @example Updated Name */
                        readonly name?: string;
                        /**
                         * Format: uuid
                         * @description Set to null to make it a root category
                         */
                        readonly parentId?: string | null;
                    };
                    readonly "multipart/form-data": {
                        /**
                         * Format: binary
                         * @description Optional replacement JPEG, PNG, or WebP image up to 5 MB.
                         */
                        readonly image?: Blob;
                        readonly name?: string;
                        /** Format: uuid */
                        readonly parentId?: string | null;
                    };
                };
            };
            readonly responses: {
                /** @description Category updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["CategorySuccess"];
                    };
                };
                /** @description Invalid ID/payload, empty update, self-parent, or descendant cycle */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Category not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Uploaded image exceeds the 5 MB limit */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        /** Delete a category (Admin only) */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Category ID */
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Category deleted */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["NullSuccess"];
                    };
                };
                /** @description Category has subcategories or attached products */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Category not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List notifications for the current user */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    /** @description Filter by read/unread status */
                    readonly isRead?: boolean;
                    readonly limit?: number;
                    readonly page?: number;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated notification list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications/{id}/read": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /** Mark a single notification as read */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Notification marked as read */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Notification not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications/fcm-token": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Register an FCM push token
         * @description Saves or updates the Firebase Cloud Messaging token for the current device. Call this after login.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example fMQbB9Q9Q7E... */
                        readonly token: string;
                    };
                };
            };
            readonly responses: {
                /** @description FCM token saved */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        /**
         * Remove the FCM push token
         * @description Deregisters the push token for the current device. Call this on logout.
         */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description FCM token removed */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications/read-all": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /** Mark all notifications as read */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description All notifications marked as read */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications/unread-count": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get count of unread notifications */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Unread count */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Unread count fetched",
                         *       "data": {
                         *         "count": 5
                         *       }
                         *     }
                         */
                        readonly "application/json": unknown;
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List the current customer's orders */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                    readonly status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated order list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — CUSTOMER role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        /**
         * Place a new order (Customer only)
         * @description Creates an order from the current cart items. Cart must be non-empty.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * Format: uuid
                         * @description Saved address ID to ship to
                         * @example d290f1ee-6c54-4b01-90e6-d701748f0851
                         */
                        readonly addressId: string;
                        /** @example Please leave at the front door */
                        readonly notes?: string;
                        /**
                         * @description Optional promotional code
                         * @example SUMMER20
                         */
                        readonly promoCode?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Order created successfully */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Validation error, empty cart, or invalid promo code */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Address not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get order details by ID (Customer only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Order detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders/{id}/cancel": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Cancel an order (Customer only)
         * @description Only orders in PENDING or CONFIRMED status can be cancelled.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: {
                readonly content: {
                    readonly "application/json": {
                        /** @example Changed my mind */
                        readonly reason?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Order cancelled */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order cannot be cancelled in its current status */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders/{id}/vendor-orders/{vendorOrderId}/status": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Update vendor sub-order status (Vendor only)
         * @description Legacy endpoint. Prefer `/orders/vendor/{id}/status` for new integrations.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Parent order ID */
                    readonly id: string;
                    /** @description Vendor order ID */
                    readonly vendorOrderId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @enum {string} */
                        readonly status: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
                    };
                };
            };
            readonly responses: {
                /** @description Status updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — VENDOR + approved status required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders/vendor": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List vendor's orders (Vendor only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Search order number, customer name or email, or tracking number */
                    readonly search?: string;
                    readonly status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated vendor orders */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorOrdersSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — VENDOR + approved status required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders/vendor/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get an owned vendor order by ID
         * @description Returns customer, shipping, payment, tracking, totals, and item details for direct dashboard routes.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Vendor order ID */
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Vendor order detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorOrderDetailSuccess"];
                    };
                };
                /** @description Invalid vendor order ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor account is not approved or does not own the order */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/orders/vendor/{id}/status": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Update vendor order status with optional tracking (Vendor only)
         * @description A retry after an ambiguous outcome is safe only when the same Idempotency-Key and request body are reused. Reconcile with GET /orders/vendor/{id} when the response code requests it.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: {
                    /** @description Stable key for safe replay of this exact mutation. */
                    readonly "Idempotency-Key"?: string;
                };
                readonly path: {
                    /** @description Vendor order ID */
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @enum {string} */
                        readonly status: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
                        /** @example UPS */
                        readonly trackingCarrier?: string;
                        /** @example 1Z999AA10123456784 */
                        readonly trackingNumber?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Vendor order status updated */
                readonly 200: {
                    headers: {
                        readonly "Idempotency-Replayed"?: "true";
                        readonly "Idempotency-Status"?: "created" | "replayed";
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — VENDOR + approved status required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Vendor order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Key conflict, request still in progress, or ambiguous outcome requiring authoritative reconciliation */
                readonly 409: {
                    headers: {
                        readonly "Idempotency-Status"?: "created" | "conflict" | "in-progress" | "ambiguous";
                        readonly "Retry-After"?: string;
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["IdempotencyError"] | components["schemas"]["ApiError"];
                    };
                };
                /** @description Mutation outcome is ambiguous and requires authoritative reconciliation */
                readonly 503: {
                    headers: {
                        readonly "Idempotency-Status"?: "ambiguous";
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["IdempotencyError"] | components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/payments/create-intent": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Create a Stripe PaymentIntent (Customer only)
         * @description Creates a Stripe PaymentIntent for an order. The returned `clientSecret` is passed to Stripe's client-side SDK to complete payment.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * @default INR
                         * @enum {string}
                         */
                        readonly currency?: "INR";
                        /**
                         * Format: uuid
                         * @example d290f1ee-6c54-4b01-90e6-d701748f0851
                         */
                        readonly orderId: string;
                    };
                };
            };
            readonly responses: {
                /** @description PaymentIntent created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Payment intent created",
                         *       "data": {
                         *         "clientSecret": "pi_3OxY...secret_...",
                         *         "amount": 9999,
                         *         "currency": "usd"
                         *       }
                         *     }
                         */
                        readonly "application/json": unknown;
                    };
                };
                /** @description Validation error or order not in payable state */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — CUSTOMER role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Order not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/payments/webhook": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Stripe payment webhook (Stripe servers only)
         * @description Receives Stripe-signed webhook events (e.g. `payment_intent.succeeded`). **Do not call this endpoint directly** — it is for Stripe's servers only. The raw request body is verified against `STRIPE_WEBHOOK_SECRET` via HMAC. This route is mounted before the global rate limiter so Stripe retries are never throttled.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": Record<string, never>;
                };
            };
            readonly responses: {
                /** @description Event received and processed */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid Stripe signature */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List products with filters
         * @description General product listing with full filtering, sorting, and pagination. No auth required.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly categoryId?: string;
                    readonly inStock?: boolean;
                    readonly limit?: number;
                    readonly maxPrice?: number;
                    readonly minPrice?: number;
                    readonly page?: number;
                    /** @description Minimum average rating filter */
                    readonly rating?: number;
                    /** @description Full-text search on product name/description */
                    readonly search?: string;
                    readonly sort?: "newest" | "price_asc" | "price_desc" | "rating" | "popular";
                    readonly vendorId?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated product list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Products fetched",
                         *       "data": {
                         *         "products": [],
                         *         "meta": {
                         *           "total": 50,
                         *           "page": 1,
                         *           "limit": 10,
                         *           "totalPages": 5
                         *         }
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["ProductsSuccess"];
                    };
                };
            };
        };
        readonly put?: never;
        /** Create a product (Vendor only) */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example 99.99 */
                        readonly basePrice: number;
                        /** Format: uuid */
                        readonly categoryId: string;
                        /** @example Premium noise-cancelling wireless headphones */
                        readonly description: string;
                        readonly images?: readonly string[];
                        /** @default true */
                        readonly isActive?: boolean;
                        /** @example Wireless Headphones */
                        readonly name: string;
                        /**
                         * @example [
                         *       "electronics",
                         *       "audio"
                         *     ]
                         */
                        readonly tags?: readonly string[];
                        readonly variants: readonly {
                            /** @example Black */
                            readonly color?: string;
                            /** @example 99.99 */
                            readonly price: number;
                            /** @example M */
                            readonly size?: string;
                            /** @example SKU-BLK-M */
                            readonly sku: string;
                            /** @example 50 */
                            readonly stock?: number;
                        }[];
                    };
                };
            };
            readonly responses: {
                /** @description Product created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMutationSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — VENDOR role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Category not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description A variant SKU already exists */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get a single product by ID */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /**
         * Update a product (Vendor only)
         * @description Vendor can only update their own products.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly basePrice?: number;
                        /** Format: uuid */
                        readonly categoryId?: string;
                        readonly description?: string;
                        readonly images?: readonly string[];
                        readonly isActive?: boolean;
                        readonly name?: string;
                        readonly tags?: readonly string[];
                    };
                };
            };
            readonly responses: {
                /** @description Product updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMutationSuccess"];
                    };
                };
                /** @description Invalid product ID or update payload */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        /**
         * Delete a product (Vendor only)
         * @description Vendor can only delete their own products.
         */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product deleted */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["NullSuccess"];
                    };
                };
                /** @description Invalid product ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product has related order history and cannot be deleted */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/{id}/editor": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Atomically save the complete vendor product editor
         * @description Reconciles product fields, ordered image URLs, variants, and inventory in one transaction.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": Record<string, never>;
                };
            };
            readonly responses: {
                /** @description Complete updated product */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMutationSuccess"];
                    };
                };
                /** @description Invalid product ID or editor payload */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor is unapproved or does not own the product */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product, category, or variant not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description SKU conflict or ordered variant removal */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/{id}/media": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Upload product images (approved owner vendor only)
         * @description Appends one to five managed images without exceeding five total. Uploads are rolled back if persistence fails. JPEG, PNG, and WebP files up to 5 MB each are accepted.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "multipart/form-data": {
                        readonly images: readonly Blob[];
                    };
                };
            };
            readonly responses: {
                /** @description Ordered product media after upload */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMediaSuccess"];
                    };
                };
                /** @description Missing files, invalid type, excess files, or five-image limit exceeded */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor is unapproved or does not own the product */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description A file exceeds 5 MB */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/{id}/media/{mediaId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Replace one product image (approved owner vendor only)
         * @description Preserves the media ID and ordering position. The new upload rolls back on persistence failure; replaced managed media is deleted best effort after commit.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                    readonly mediaId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "multipart/form-data": {
                        /** Format: binary */
                        readonly image: Blob;
                    };
                };
            };
            readonly responses: {
                /** @description Ordered product media after replacement */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMediaSuccess"];
                    };
                };
                /** @description Missing image, invalid type, or unexpected field */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor is unapproved or does not own the product */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product or media not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description The file exceeds 5 MB */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        /**
         * Remove one product image (approved owner vendor only)
         * @description The database mutation is authoritative. Managed Cloudinary cleanup is best effort and observable in server logs.
         */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                    readonly mediaId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Ordered remaining product media */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMediaSuccess"];
                    };
                };
                /** @description Invalid product or media ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor is unapproved or does not own the product */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product or media not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/{id}/variants": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /** Add a variant to a product (Vendor only) */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Product ID */
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example Red */
                        readonly color?: string;
                        /** @example 29.99 */
                        readonly price: number;
                        /** @example L */
                        readonly size?: string;
                        /** @example SKU-RED-L */
                        readonly sku: string;
                        /**
                         * @default 0
                         * @example 100
                         */
                        readonly stock?: number;
                    };
                };
            };
            readonly responses: {
                /** @description Variant added */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductVariantSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — VENDOR role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description SKU already exists */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/{id}/variants/{vid}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /** Update a product variant (Vendor only) */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Product ID */
                    readonly id: string;
                    /** @description Variant ID */
                    readonly vid: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly color?: string | null;
                        readonly price?: number;
                        readonly size?: string | null;
                        readonly sku?: string;
                        readonly stock?: number;
                    };
                };
            };
            readonly responses: {
                /** @description Variant updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductVariantSuccess"];
                    };
                };
                /** @description Invalid route parameter or update payload */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product or variant not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description SKU already exists */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        /**
         * Delete an unreferenced product variant (Vendor only)
         * @description Variants referenced by order history are retained and return 409 Conflict.
         */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                    readonly vid: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Variant deleted */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["NullSuccess"];
                    };
                };
                /** @description Invalid route parameter */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor does not own the product */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product or variant not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Variant is referenced by order history */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/search": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Search products by keyword
         * @description Simplified search endpoint — keyword + pagination + sort only. No auth required.
         */
        readonly get: {
            readonly parameters: {
                readonly query: {
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Search keyword */
                    readonly q: string;
                    readonly sort?: "newest" | "price_asc" | "price_desc" | "rating" | "popular";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Matching products */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Missing required query param `q` */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/vendor": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List the authenticated vendor's inventory
         * @description Includes active and inactive products. Vendor identity is derived from the authenticated session.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly categoryId?: string;
                    readonly inStock?: boolean;
                    readonly isActive?: boolean;
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Case-insensitive product name, description, or variant SKU search. */
                    readonly search?: string;
                    readonly sortBy?: "createdAt" | "updatedAt" | "name" | "basePrice";
                    readonly sortOrder?: "asc" | "desc";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated vendor inventory */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductsSuccess"];
                    };
                };
                /** @description Invalid query parameters */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor account is not approved */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/products/vendor/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get an owned product for editing
         * @description Returns active or inactive product details only when the authenticated approved vendor owns the product.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Owned product detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ProductMutationSuccess"];
                    };
                };
                /** @description Invalid product ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor account is not approved */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/promo-codes": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List promo codes (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly discountType?: "PERCENTAGE" | "FIXED";
                    readonly isActive?: boolean;
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Filter by code (partial match) */
                    readonly search?: string;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated promo codes */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["PromoCodesSuccess"];
                    };
                };
                /** @description Invalid pagination or filter query */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        /** Create a promo code (Admin only) */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * @description Automatically uppercased
                         * @example SUMMER20
                         */
                        readonly code: string;
                        /** @enum {string} */
                        readonly discountType: "PERCENTAGE" | "FIXED";
                        /** @example 20 */
                        readonly discountValue: number;
                        /**
                         * Format: date-time
                         * @description Must be a future date
                         * @example 2025-12-31T23:59:59Z
                         */
                        readonly expiresAt?: string;
                        /** @default true */
                        readonly isActive?: boolean;
                        /**
                         * @description Maximum discount cap (used with PERCENTAGE type)
                         * @example 30
                         */
                        readonly maxDiscount?: number;
                        /** @example 50 */
                        readonly minOrderValue?: number;
                        /** @description Max uses per user */
                        readonly perUserLimit?: number;
                        /** @description Total number of times this code can be used */
                        readonly usageLimit?: number;
                    };
                };
            };
            readonly responses: {
                /** @description Promo code created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["PromoCodeSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Promo code already exists */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/promo-codes/{id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get a promo code by ID (Admin only) */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Promo code detail */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["PromoCodeDetailSuccess"];
                    };
                };
                /** @description Invalid promo code ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Promo code not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        /** Update a promo code (Admin only) */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly code?: string;
                        /** @enum {string} */
                        readonly discountType?: "PERCENTAGE" | "FIXED";
                        readonly discountValue?: number;
                        /** Format: date-time */
                        readonly expiresAt?: string | null;
                        readonly isActive?: boolean;
                        readonly maxDiscount?: number | null;
                        readonly minOrderValue?: number | null;
                        readonly perUserLimit?: number | null;
                        readonly usageLimit?: number | null;
                    };
                };
            };
            readonly responses: {
                /** @description Promo code updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["PromoCodeSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Promo code not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Promo code already exists */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        /**
         * Archive a promo code (Admin only)
         * @description Soft-deactivates the promo by setting isActive=false and deletedAt. Order and usage history are retained; this is not a permanent deletion.
         */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly id: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Promo code archived and returned with its inactive/deleted state */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["PromoCodeSuccess"];
                    };
                };
                /** @description Invalid promo code ID */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Promo code not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/reviews": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Create a product review
         * @description Users can only review products they have purchased.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /** @example Great product, fast delivery! */
                        readonly comment?: string;
                        /** Format: uuid */
                        readonly productId: string;
                        /** @example 4 */
                        readonly rating: number;
                    };
                };
            };
            readonly responses: {
                /** @description Review created */
                readonly 201: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Validation error or already reviewed */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/reviews/{reviewId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /** Update a review */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly reviewId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly comment?: string | null;
                        readonly rating?: number;
                    };
                };
            };
            readonly responses: {
                /** @description Review updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — can only update your own reviews */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Review not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly post?: never;
        /** Delete a review */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly reviewId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Review deleted */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — can only delete your own reviews */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Review not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/reviews/my-reviews": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get reviews written by the current user */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated list of user's reviews */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/reviews/product/{productId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get reviews for a product */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                    /** @description Filter by exact star rating */
                    readonly rating?: number;
                    readonly sort?: "newest" | "oldest" | "highest" | "lowest";
                };
                readonly header?: never;
                readonly path: {
                    readonly productId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated reviews for the product */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/admin/commission/{vendorId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        /** Set a vendor's commission rate (Admin only) */
        readonly patch: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    /** @description Vendor user ID */
                    readonly vendorId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * @description Platform commission percentage (0-100)
                         * @example 15
                         */
                        readonly commissionRate: number;
                    };
                };
            };
            readonly responses: {
                /** @description Commission rate updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorPayoutCommissionSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — ADMIN role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly trace?: never;
    };
    readonly "/vendor-payouts/connect/onboard": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Start Stripe Connect onboarding (approved Vendors only)
         * @description Generates a single-use Stripe-hosted onboarding URL using backend-configured return and refresh URLs; clients cannot supply either redirect. Navigate the browser at top level, then reconcile completion with GET /vendor-payouts/connect/status after Stripe returns.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Onboarding URL */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Onboarding link generated",
                         *       "data": {
                         *         "url": "https://connect.stripe.com/setup/s/..."
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["ConnectOnboardingSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — must be an approved vendor */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/connect/onboard/refresh": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Refresh the Stripe Connect onboarding link (approved Vendors only)
         * @description Returns a fresh single-use onboarding URL when Stripe reaches the backend-configured refresh route. Call once per refresh event, navigate at top level, and guard the client against retry loops. Redirect targets are server configuration, never request input.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Refreshed onboarding URL */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ConnectOnboardingSuccess"];
                    };
                };
                /** @description Stripe onboarding has not been started */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — must be an approved vendor */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/connect/status": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get Stripe Connect account status (Vendor only)
         * @description Reconciles the Stripe account after onboarding return. Use onboardingStatus, chargesEnabled, payoutsEnabled, and detailsSubmitted as authoritative UI inputs; return query parameters are not proof of completion.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Connect account status */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Connect status fetched",
                         *       "data": {
                         *         "onboardingStatus": "COMPLETE",
                         *         "chargesEnabled": true,
                         *         "payoutsEnabled": true,
                         *         "detailsSubmitted": true
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["ConnectStatusSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — VENDOR role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/earnings": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List vendor earnings (approved Vendors only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly endDate?: string;
                    readonly limit?: number;
                    readonly page?: number;
                    readonly startDate?: string;
                    readonly status?: "PENDING" | "TRANSFERRED" | "FAILED" | "REVERSED";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated earnings list */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorEarningsSuccess"];
                    };
                };
                /** @description Invalid pagination, status, or date filter */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/earnings/summary": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get earnings summary (approved Vendors only)
         * @description Returns count, gross, commission, and net aggregates for every earning status.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Earnings summary */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["EarningsSummarySuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — must be an approved vendor */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/payouts": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** List payouts (approved Vendors only) */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                    readonly status?: "PENDING" | "PAID" | "FAILED";
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated payouts */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorPayoutsSuccess"];
                    };
                };
                /** @description Invalid pagination or status filter */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-payouts/webhook": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Stripe Connect webhook (Stripe servers only)
         * @description Receives Stripe Connect webhook events (e.g. `account.updated`, `payout.paid`). **Do not call this endpoint directly** — it is for Stripe's servers only. This route is mounted before the global rate limiter so Stripe retries are never throttled.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": Record<string, never>;
                };
            };
            readonly responses: {
                /** @description Event received */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid Stripe signature */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/vendor-profile/me": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the current vendor's profile
         * @description Any vendor can view their own profile regardless of approval status.
         */
        readonly get: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Vendor profile */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Vendor profile fetched",
                         *       "data": {
                         *         "id": "uuid",
                         *         "userId": "uuid",
                         *         "storeName": "Jane's Boutique",
                         *         "description": "Quality handmade goods",
                         *         "status": "PENDING",
                         *         "storeLogo": null,
                         *         "storeBanner": null,
                         *         "user": {
                         *           "name": "Jane Vendor",
                         *           "email": "jane@example.com",
                         *           "avatar": null
                         *         }
                         *       }
                         *     }
                         */
                        readonly "application/json": components["schemas"]["VendorProfileSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — VENDOR role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        /**
         * Update the vendor profile (pending or approved vendors only)
         * @description Send text-only updates as JSON or multipart. Multipart accepts at most one `logo` and one `banner`. File-only and mixed updates are valid; a true no-op is rejected. Each file must be JPEG, PNG, or WebP and at most 5 MB. New uploads roll back on DB failure; replaced-media cleanup is observable and best effort.
         */
        readonly put: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        readonly description?: string;
                        readonly storeName?: string;
                    };
                    readonly "multipart/form-data": {
                        /**
                         * Format: binary
                         * @description Optional single JPEG, PNG, or WebP image up to 5 MB
                         */
                        readonly banner?: Blob;
                        /** @example Quality handmade goods from local artisans */
                        readonly description?: string;
                        /**
                         * Format: binary
                         * @description Optional single JPEG, PNG, or WebP image up to 5 MB
                         */
                        readonly logo?: Blob;
                        /** @example Jane's Boutique */
                        readonly storeName?: string;
                    };
                };
            };
            readonly responses: {
                /** @description Profile updated */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["VendorProfileMutationSuccess"];
                    };
                };
                /** @description Validation error */
                readonly 400: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Forbidden — vendor profile cannot be edited in current status */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Vendor profile not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Store name is already in use */
                readonly 409: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description An uploaded image exceeds the 5 MB limit */
                readonly 413: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiError"];
                    };
                };
            };
        };
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/wishlist": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Get the customer's wishlist */
        readonly get: {
            readonly parameters: {
                readonly query?: {
                    readonly limit?: number;
                    readonly page?: number;
                };
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Paginated wishlist */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        readonly "application/json": components["schemas"]["ApiSuccess"];
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden — CUSTOMER role required */
                readonly 403: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly put?: never;
        /**
         * Toggle a product in/out of the wishlist
         * @description If the product is already in the wishlist it is removed; otherwise it is added.
         */
        readonly post: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path?: never;
                readonly cookie?: never;
            };
            readonly requestBody: {
                readonly content: {
                    readonly "application/json": {
                        /**
                         * Format: uuid
                         * @example d290f1ee-6c54-4b01-90e6-d701748f0851
                         */
                        readonly productId: string;
                    };
                };
            };
            readonly responses: {
                /** @description Product toggled in wishlist */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content: {
                        /**
                         * @example {
                         *       "success": true,
                         *       "message": "Added to wishlist",
                         *       "data": {
                         *         "added": true
                         *       }
                         *     }
                         */
                        readonly "application/json": unknown;
                    };
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Product not found */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/wishlist/{productId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        /** Remove a product from the wishlist */
        readonly delete: {
            readonly parameters: {
                readonly query?: never;
                readonly header?: never;
                readonly path: {
                    readonly productId: string;
                };
                readonly cookie?: never;
            };
            readonly requestBody?: never;
            readonly responses: {
                /** @description Product removed from wishlist */
                readonly 200: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                readonly 401: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Product not in wishlist */
                readonly 404: {
                    headers: {
                        readonly [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        readonly AdminDashboardSuccess: {
            readonly data: {
                readonly bannedUsers: number;
                readonly pendingVendors: number;
                readonly platformRevenue: string;
                readonly totalOrders: number;
                readonly totalProducts: number;
                readonly totalUsers: number;
                readonly totalVendors: number;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminEarningsStatusTotal: {
            readonly count: number;
            readonly grossRevenue: string;
            readonly platformCommission: string;
            /** @enum {string} */
            readonly status: "PENDING" | "TRANSFERRED" | "FAILED" | "REVERSED";
            readonly vendorEarnings: string;
        };
        readonly AdminFinanceTotals: {
            readonly grossRevenue: string;
            readonly platformCommission: string;
            readonly vendorEarnings: string;
            readonly vendorOrderCount: number;
        };
        readonly AdminFulfillmentStatus: {
            /** @enum {string} */
            readonly kind: "NONE" | "SINGLE" | "MIXED";
            /** @enum {string|null} */
            readonly status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED" | null;
            readonly statuses: readonly ("PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED")[];
        };
        readonly AdminOrderDetail: {
            readonly address: {
                readonly [key: string]: string;
            };
            readonly cancellationReason: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly discount: string;
            readonly fulfillmentStatus: components["schemas"]["AdminFulfillmentStatus"];
            readonly id: string;
            readonly notes: string | null;
            readonly orderNumber: string;
            readonly payment: components["schemas"]["VendorOrderPayment"] | null;
            readonly promoCode: {
                readonly code: string;
                /** @enum {string} */
                readonly discountType: "PERCENTAGE" | "FIXED";
                readonly discountValue: string;
            } | null;
            readonly shippingAddress: {
                readonly [key: string]: unknown;
            };
            readonly subtotal: string;
            readonly tax: string;
            readonly total: string;
            /** Format: date-time */
            readonly updatedAt: string;
            readonly user: {
                readonly email: string;
                readonly id: string;
                readonly name: string;
            };
            readonly vendorOrders: readonly components["schemas"]["AdminOrderVendorDetail"][];
        };
        readonly AdminOrderDetailSuccess: {
            readonly data: components["schemas"]["AdminOrderDetail"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminOrderItem: {
            readonly id: string;
            readonly quantity: number;
            readonly totalPrice: string;
            readonly unitPrice: string;
            readonly variant: {
                readonly color: string | null;
                readonly price: string;
                readonly product: {
                    readonly images: readonly string[];
                    readonly name: string;
                };
                readonly size: string | null;
                readonly sku: string;
            };
        };
        readonly AdminOrderPaymentSummary: {
            /** @enum {string} */
            readonly method: "CARD" | "CASH_ON_DELIVERY" | "WALLET";
            /** @enum {string} */
            readonly status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELLED";
        };
        readonly AdminOrdersSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["AdminOrderSummary"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminOrderSummary: {
            /** Format: date-time */
            readonly createdAt: string;
            readonly discount: string;
            readonly fulfillmentStatus: components["schemas"]["AdminFulfillmentStatus"];
            readonly id: string;
            readonly orderNumber: string;
            readonly payment: components["schemas"]["AdminOrderPaymentSummary"] | null;
            readonly subtotal: string;
            readonly tax: string;
            readonly total: string;
            readonly user: {
                readonly email: string;
                readonly id: string;
                readonly name: string;
            };
            readonly vendorOrders: readonly components["schemas"]["AdminOrderVendorSummary"][];
        };
        readonly AdminOrderVendorDetail: {
            readonly id: string;
            readonly items: readonly components["schemas"]["AdminOrderItem"][];
            /** @enum {string} */
            readonly status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
            readonly subtotal: string;
            readonly trackingCarrier: string | null;
            readonly trackingNumber: string | null;
            readonly vendor: {
                readonly vendorProfile: {
                    readonly id: string;
                    readonly storeName: string;
                } | null;
            };
            readonly vendorId: string;
        };
        readonly AdminOrderVendorSummary: {
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
            readonly subtotal: string;
            readonly vendor: {
                readonly vendorProfile: {
                    readonly storeName: string;
                } | null;
            };
            readonly vendorId: string;
        };
        readonly AdminPayoutStatusTotal: {
            readonly amount: string;
            readonly count: number;
            /** @enum {string} */
            readonly status: "PENDING" | "PAID" | "FAILED";
        };
        readonly AdminProductDetail: {
            readonly avgRating: string;
            readonly basePrice: string;
            readonly category: {
                readonly id: string;
                readonly name: string;
                readonly parentId: string | null;
                readonly slug: string;
            };
            readonly categoryId: string;
            /** Format: date-time */
            readonly createdAt: string;
            readonly description: string;
            readonly id: string;
            readonly images: readonly string[];
            readonly isActive: boolean;
            readonly media: readonly components["schemas"]["ProductMedia"][];
            readonly name: string;
            readonly reviewCount: number;
            readonly tags: readonly string[];
            /** Format: date-time */
            readonly updatedAt: string;
            readonly variants: readonly components["schemas"]["ProductVariant"][];
            readonly vendor: components["schemas"]["AdminProductVendor"];
            readonly vendorId: string;
        };
        readonly AdminProductDetailSuccess: {
            readonly data: components["schemas"]["AdminProductDetail"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminProductListItem: {
            readonly _count: {
                readonly variants: number;
            };
            readonly avgRating: string;
            readonly basePrice: string;
            readonly category: {
                readonly id: string;
                readonly name: string;
            };
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly isActive: boolean;
            readonly name: string;
            readonly reviewCount: number;
            readonly vendor: {
                readonly email: string;
                readonly id: string;
                readonly name: string;
            };
        };
        readonly AdminProductsSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["AdminProductListItem"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminProductStatusMutationSuccess: {
            readonly data: {
                readonly id: string;
                readonly isActive: boolean;
                readonly name: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminProductVendor: {
            readonly email: string;
            readonly id: string;
            readonly name: string;
            readonly vendorProfile: {
                readonly id: string;
                /** @enum {string} */
                readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
                readonly storeName: string;
            } | null;
        };
        readonly AdminRecentPayout: {
            readonly amount: string;
            /** Format: date-time */
            readonly arrivalDate: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            /** @enum {string} */
            readonly currency: "INR";
            readonly failureReason: string | null;
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "PAID" | "FAILED";
            readonly vendorProfile: {
                readonly id: string;
                readonly storeName: string;
            };
        };
        readonly AdminRevenueSuccess: {
            readonly data: {
                readonly dateRange: {
                    readonly endDate: string;
                    readonly startDate: string;
                };
                readonly earningsByStatus: readonly components["schemas"]["AdminEarningsStatusTotal"][];
                readonly payoutsByStatus: readonly components["schemas"]["AdminPayoutStatusTotal"][];
                /** @enum {string} */
                readonly period: "day" | "week" | "month";
                readonly recentPayouts: readonly components["schemas"]["AdminRecentPayout"][];
                readonly series: readonly components["schemas"]["RevenueBucket"][];
                readonly totals: components["schemas"]["AdminFinanceTotals"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminUserBanMutationSuccess: {
            readonly data: {
                readonly email: string;
                readonly id: string;
                readonly isBanned: boolean;
                readonly name: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminUserDetail: {
            readonly avatar: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly email: string;
            readonly id: string;
            readonly isBanned: boolean;
            readonly isVerified: boolean;
            readonly name: string;
            /** @enum {string} */
            readonly role: "CUSTOMER" | "VENDOR" | "ADMIN";
            /** Format: date-time */
            readonly updatedAt: string;
            readonly vendorProfile: components["schemas"]["AdminVendorProfileDetail"] | null;
        };
        readonly AdminUserDetailSuccess: {
            readonly data: components["schemas"]["AdminUserDetail"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminUsersSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["AdminUserSummary"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminUserSummary: {
            /** Format: date-time */
            readonly createdAt: string;
            readonly email: string;
            readonly id: string;
            readonly isBanned: boolean;
            readonly isVerified: boolean;
            readonly name: string;
            /** @enum {string} */
            readonly role: "CUSTOMER" | "VENDOR" | "ADMIN";
            readonly vendorProfile: {
                readonly id: string;
                /** @enum {string} */
                readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
                readonly storeName: string;
            } | null;
        };
        readonly AdminVendorDetail: {
            readonly commissionRate: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly description: string | null;
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
            readonly storeBanner: string | null;
            readonly storeLogo: string | null;
            readonly storeName: string;
            /** @enum {string} */
            readonly stripeOnboardingStatus: "NOT_STARTED" | "PENDING" | "COMPLETE" | "RESTRICTED";
            /** Format: date-time */
            readonly updatedAt: string;
            readonly user: components["schemas"]["AdminVendorOwner"];
            readonly userId: string;
        };
        readonly AdminVendorDetailSuccess: {
            readonly data: components["schemas"]["AdminVendorDetail"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminVendorLifecycle: {
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
            readonly storeName: string;
            readonly userId: string;
        };
        readonly AdminVendorLifecycleSuccess: {
            readonly data: components["schemas"]["AdminVendorLifecycle"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminVendorOwner: {
            readonly avatar: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly email: string;
            readonly id: string;
            readonly isBanned: boolean;
            readonly isVerified: boolean;
            readonly name: string;
        };
        readonly AdminVendorProfileDetail: {
            readonly commissionRate: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly description: string | null;
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
            readonly storeBanner: string | null;
            readonly storeLogo: string | null;
            readonly storeName: string;
            /** @enum {string} */
            readonly stripeOnboardingStatus: "NOT_STARTED" | "PENDING" | "COMPLETE" | "RESTRICTED";
            /** Format: date-time */
            readonly updatedAt: string;
            readonly userId: string;
        };
        readonly AdminVendorsSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["AdminVendorSummary"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly AdminVendorSummary: {
            readonly commissionRate: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
            readonly storeName: string;
            /** @enum {string} */
            readonly stripeOnboardingStatus: "NOT_STARTED" | "PENDING" | "COMPLETE" | "RESTRICTED";
            readonly user: {
                readonly email: string;
                readonly id: string;
                readonly isBanned: boolean;
                readonly name: string;
            };
        };
        readonly ApiError: {
            readonly errors?: readonly {
                /** @example email */
                readonly field?: string;
                /** @example Invalid email address */
                readonly message?: string;
            }[];
            /** @example Validation failed */
            readonly message: string;
            /**
             * @example false
             * @enum {boolean}
             */
            readonly success: false;
        };
        readonly ApiSuccess: {
            readonly data: unknown;
            /** @example Operation successful */
            readonly message: string;
            /**
             * @example true
             * @enum {boolean}
             */
            readonly success: true;
        };
        readonly AuthTokens: {
            readonly accessToken: string;
            readonly refreshToken: string;
        };
        readonly Banner: {
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly imageUrl: string;
            readonly isActive: boolean;
            readonly linkUrl: string | null;
            readonly position: number;
            readonly title: string;
            /** Format: date-time */
            readonly updatedAt: string;
        };
        readonly BannerListSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["Banner"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly BannerSuccess: {
            readonly data: components["schemas"]["Banner"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly CategoriesSuccess: {
            readonly data: readonly components["schemas"]["CategoryTreeNode"][];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly Category: {
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly image: string | null;
            readonly name: string;
            readonly parentId: string | null;
            readonly slug: string;
            /** Format: date-time */
            readonly updatedAt: string;
        };
        readonly CategorySuccess: {
            readonly data: components["schemas"]["Category"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly CategoryTreeNode: {
            readonly children: readonly components["schemas"]["CategoryTreeNode"][];
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly image: string | null;
            readonly name: string;
            readonly parentId: string | null;
            readonly slug: string;
            /** Format: date-time */
            readonly updatedAt: string;
        };
        readonly CommissionMutationSuccess: {
            readonly data: {
                readonly rate: number;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly CommissionSuccess: {
            readonly data: {
                readonly rate: number;
                /** @enum {string} */
                readonly source?: "database" | "env_fallback";
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly ConnectOnboardingSuccess: {
            readonly data: {
                /** Format: uri */
                readonly url: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly ConnectStatusSuccess: {
            readonly data: {
                readonly chargesEnabled: boolean;
                readonly detailsSubmitted: boolean;
                /** @enum {string} */
                readonly onboardingStatus: "NOT_STARTED" | "PENDING" | "COMPLETE" | "RESTRICTED";
                readonly payoutsEnabled: boolean;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly EarningsAmounts: {
            readonly commissionAmount: number;
            readonly count: number;
            readonly grossAmount: number;
            readonly netAmount: number;
        };
        readonly EarningsSummarySuccess: {
            readonly data: {
                readonly failed: components["schemas"]["EarningsAmounts"];
                readonly pending: components["schemas"]["EarningsAmounts"];
                readonly reversed: components["schemas"]["EarningsAmounts"];
                readonly transferred: components["schemas"]["EarningsAmounts"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly IdempotencyError: {
            /** @enum {string} */
            readonly code: "IDEMPOTENCY_KEY_REUSED" | "IDEMPOTENCY_REQUEST_IN_PROGRESS" | "IDEMPOTENCY_OUTCOME_AMBIGUOUS" | "IDEMPOTENCY_PERSISTENCE_FAILED";
            readonly message: string;
            readonly reconciliation: {
                /** @enum {string} */
                readonly method: "GET";
                readonly path: string;
            };
            /** @enum {boolean} */
            readonly success: false;
        };
        readonly LoginSuccess: {
            readonly data: {
                readonly tokens: components["schemas"]["AuthTokens"];
                readonly user: components["schemas"]["UserProfile"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        } | {
            readonly data: {
                readonly user: components["schemas"]["UserProfile"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly LogoutSuccess: {
            readonly data: unknown;
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly NullSuccess: {
            /** @enum {unknown|null} */
            readonly data: null;
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly Pagination: {
            readonly limit: number;
            readonly page: number;
            readonly total: number;
            readonly totalPages: number;
        };
        readonly PaginationMeta: {
            /** @example 10 */
            readonly limit?: number;
            /** @example 1 */
            readonly page?: number;
            /** @example 100 */
            readonly total?: number;
            /** @example 10 */
            readonly totalPages?: number;
        };
        readonly ProductMedia: {
            /** Format: date-time */
            readonly createdAt: string;
            /** Format: uuid */
            readonly id: string;
            readonly position: number;
            /** Format: date-time */
            readonly updatedAt: string;
            /** Format: uri */
            readonly url: string;
        };
        readonly ProductMediaSuccess: {
            readonly data: readonly components["schemas"]["ProductMedia"][];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly ProductMutation: {
            readonly avgRating: string;
            readonly basePrice: string;
            readonly categoryId: string;
            /** Format: date-time */
            readonly createdAt: string;
            readonly description: string;
            readonly id: string;
            readonly images: readonly string[];
            readonly isActive: boolean;
            readonly media: readonly components["schemas"]["ProductMedia"][];
            readonly name: string;
            readonly reviewCount: number;
            readonly tags: readonly string[];
            /** Format: date-time */
            readonly updatedAt: string;
            readonly variants?: readonly components["schemas"]["ProductVariant"][];
            readonly vendorId: string;
        };
        readonly ProductMutationSuccess: {
            readonly data: components["schemas"]["ProductMutation"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly ProductsSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["ProductSummary"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly ProductSummary: {
            readonly avgRating: string;
            readonly basePrice: string;
            readonly category: {
                readonly id: string;
                readonly name: string;
            };
            readonly categoryId: string;
            /** Format: date-time */
            readonly createdAt: string;
            readonly description: string;
            readonly id: string;
            readonly images: readonly string[];
            readonly isActive: boolean;
            readonly media: readonly components["schemas"]["ProductMedia"][];
            readonly name: string;
            readonly reviewCount: number;
            readonly tags: readonly string[];
            /** Format: date-time */
            readonly updatedAt: string;
            readonly variants: readonly components["schemas"]["ProductVariant"][];
            readonly vendor: {
                readonly id: string;
                readonly name: string;
            };
            readonly vendorId: string;
        };
        readonly ProductVariant: {
            readonly color?: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly price: string;
            readonly productId: string;
            readonly size?: string | null;
            readonly sku: string;
            readonly stock: number;
            /** Format: date-time */
            readonly updatedAt: string;
        };
        readonly ProductVariantSuccess: {
            readonly data: components["schemas"]["ProductVariant"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly ProfileSuccess: {
            readonly data: components["schemas"]["UserProfile"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly PromoCode: {
            readonly code: string;
            /** Format: date-time */
            readonly createdAt: string;
            /** Format: date-time */
            readonly deletedAt: string | null;
            /** @enum {string} */
            readonly discountType: "PERCENTAGE" | "FIXED";
            readonly discountValue: string;
            /** Format: date-time */
            readonly expiresAt: string | null;
            readonly id: string;
            readonly isActive: boolean;
            readonly maxDiscount: string | null;
            readonly minOrderValue: string | null;
            readonly perUserLimit: number | null;
            /** Format: date-time */
            readonly updatedAt: string;
            readonly usageCount: number;
            readonly usageLimit: number | null;
        };
        readonly PromoCodeDetail: components["schemas"]["PromoCodeWithCounts"] & {
            readonly usages: readonly {
                readonly id: string;
                readonly orderId: string;
                readonly promoCodeId: string;
                /** Format: date-time */
                readonly usedAt: string;
                readonly user: {
                    readonly email: string;
                    readonly id: string;
                    readonly name: string;
                };
                readonly userId: string;
            }[];
        };
        readonly PromoCodeDetailSuccess: {
            readonly data: components["schemas"]["PromoCodeDetail"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly PromoCodesSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["PromoCodeWithCounts"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly PromoCodeSuccess: {
            readonly data: components["schemas"]["PromoCode"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly PromoCodeWithCounts: components["schemas"]["PromoCode"] & {
            readonly _count: {
                readonly orders: number;
                readonly usages: number;
            };
        };
        readonly PublicBanner: {
            readonly id: string;
            readonly imageUrl: string;
            readonly linkUrl: string | null;
            readonly position: number;
            readonly title: string;
        };
        readonly PublicBannersSuccess: {
            readonly data: readonly components["schemas"]["PublicBanner"][];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly RefreshSuccess: {
            readonly data: components["schemas"]["AuthTokens"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        } | {
            readonly data: unknown;
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly RevenueBucket: {
            readonly orderCount: number;
            readonly periodStart: string;
            readonly revenue: string;
        };
        readonly UserProfile: {
            readonly avatar: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            readonly email: string;
            readonly id: string;
            readonly isVerified: boolean;
            readonly name: string;
            /** @enum {string} */
            readonly role: "CUSTOMER" | "VENDOR" | "ADMIN";
        };
        readonly VendorAnalyticsSummarySuccess: {
            readonly data: {
                readonly dateRange: {
                    readonly endDate: string | null;
                    readonly startDate: string | null;
                };
                readonly orders: {
                    readonly billableOrders: number;
                    readonly byStatus: {
                        readonly [key: string]: number;
                    };
                    readonly totalOrders: number;
                };
                readonly revenue: {
                    readonly commission: string;
                    readonly gross: string;
                    readonly net: string;
                };
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorCommissionMutationSuccess: {
            readonly data: {
                readonly commissionRate: string | null;
                readonly id: string;
                readonly storeName: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorEarning: {
            readonly commissionAmount: string;
            readonly commissionRate: string;
            /** Format: date-time */
            readonly createdAt: string;
            /** @enum {string} */
            readonly currency: "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";
            readonly grossAmount: string;
            readonly id: string;
            readonly netAmount: string;
            readonly order: {
                readonly orderNumber: string;
            };
            readonly orderId: string;
            /** @enum {string} */
            readonly status: "PENDING" | "TRANSFERRED" | "FAILED" | "REVERSED";
            readonly stripeTransferId: string | null;
            /** Format: date-time */
            readonly transferredAt: string | null;
            /** Format: date-time */
            readonly updatedAt: string;
            readonly vendorOrderId: string;
            readonly vendorProfileId: string;
        };
        readonly VendorEarningsSuccess: {
            readonly data: {
                readonly earnings: readonly components["schemas"]["VendorEarning"][];
                readonly pagination: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorOrderDetail: {
            readonly allowedNextStatuses: readonly ("CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED")[];
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly items: readonly components["schemas"]["VendorOrderItem"][];
            readonly order: {
                /** Format: date-time */
                readonly createdAt: string;
                readonly id: string;
                readonly notes: string | null;
                readonly orderNumber: string;
                readonly payment: components["schemas"]["VendorOrderPayment"] | null;
                readonly shippingAddress: {
                    readonly [key: string]: unknown;
                };
                /** Format: date-time */
                readonly updatedAt: string;
                readonly user: {
                    readonly email: string;
                    readonly id: string;
                    readonly name: string;
                };
            };
            readonly orderId: string;
            /** @enum {string} */
            readonly status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
            readonly subtotal: string;
            readonly trackingCarrier: string | null;
            readonly trackingNumber: string | null;
            /** Format: date-time */
            readonly updatedAt: string;
            readonly vendorId: string;
        };
        readonly VendorOrderDetailSuccess: {
            readonly data: components["schemas"]["VendorOrderDetail"];
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorOrderItem: {
            /** Format: date-time */
            readonly createdAt: string;
            readonly id: string;
            readonly quantity: number;
            readonly totalPrice: string;
            readonly unitPrice: string;
            /** Format: date-time */
            readonly updatedAt: string;
            readonly variant: {
                readonly color: string | null;
                readonly id: string;
                readonly price: string;
                readonly product: {
                    readonly id: string;
                    readonly images: readonly string[];
                    readonly name: string;
                };
                readonly size: string | null;
                readonly sku: string;
            };
            readonly variantId: string;
            readonly vendorOrderId: string;
        };
        readonly VendorOrderPayment: {
            /** @enum {string} */
            readonly method: "CARD" | "CASH_ON_DELIVERY" | "WALLET";
            /** Format: date-time */
            readonly paidAt: string | null;
            /** @enum {string} */
            readonly status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELLED";
        };
        readonly VendorOrdersSuccess: {
            readonly data: {
                readonly items: readonly components["schemas"]["VendorOrderDetail"][];
                readonly meta: components["schemas"]["Pagination"];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorPayout: {
            readonly amount: string;
            /** Format: date-time */
            readonly arrivalDate: string | null;
            /** Format: date-time */
            readonly createdAt: string;
            /** @enum {string} */
            readonly currency: "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";
            readonly failureReason: string | null;
            readonly id: string;
            /** @enum {string} */
            readonly status: "PENDING" | "PAID" | "FAILED";
            readonly stripePayoutId: string;
            /** Format: date-time */
            readonly updatedAt: string;
            readonly vendorProfileId: string;
        };
        readonly VendorPayoutCommissionSuccess: {
            readonly data: {
                readonly commissionRate: number;
                readonly vendorId: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorPayoutsSuccess: {
            readonly data: {
                readonly pagination: components["schemas"]["Pagination"];
                readonly payouts: readonly components["schemas"]["VendorPayout"][];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorProfileMutationSuccess: {
            readonly data: {
                readonly description: string | null;
                readonly id: string;
                /** @enum {string} */
                readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
                readonly storeBanner: string | null;
                readonly storeLogo: string | null;
                readonly storeName: string;
                readonly userId: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorProfileSuccess: {
            readonly data: {
                readonly description?: string | null;
                readonly id: string;
                /** @enum {string} */
                readonly status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
                readonly storeBanner?: string | null;
                readonly storeLogo?: string | null;
                readonly storeName: string;
                readonly user: {
                    readonly avatar: string | null;
                    readonly email: string;
                    readonly name: string;
                };
                readonly userId: string;
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorSalesSuccess: {
            readonly data: {
                readonly dateRange: {
                    readonly endDate: string;
                    readonly startDate: string;
                };
                /** @enum {string} */
                readonly period: "day" | "week" | "month";
                readonly series: readonly components["schemas"]["RevenueBucket"][];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
        readonly VendorTopProductsSuccess: {
            readonly data: {
                readonly dateRange: {
                    readonly endDate: string | null;
                    readonly startDate: string | null;
                };
                readonly products: readonly {
                    readonly orderCount: number;
                    readonly productId: string;
                    readonly productName: string;
                    readonly rank: number;
                    readonly totalRevenue: string;
                }[];
            };
            readonly message: string;
            /** @enum {boolean} */
            readonly success: true;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

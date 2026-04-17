import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Multi-Vendor E-Commerce API',
      version: '1.0.0',
      description:
        'REST API for the multi-vendor e-commerce platform. ' +
        'Most endpoints require a Bearer JWT — click **Authorize** and enter `Bearer <access_token>`.',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT access token obtained from POST /auth/login. ' +
            'Enter: `Bearer <access_token>`',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email address' },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
          },
        },
      },
    },
    // Global default: every endpoint requires BearerAuth unless overridden with security: []
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & session management' },
      {
        name: 'Products',
        description: 'Product catalogue (public) and vendor inventory management',
      },
      { name: 'Categories', description: 'Product category tree management' },
      { name: 'Cart', description: 'Shopping cart (authenticated customers)' },
      { name: 'Orders', description: 'Order placement, tracking, and management' },
      { name: 'Addresses', description: 'Customer shipping address book' },
      { name: 'Reviews', description: 'Product reviews and ratings' },
      { name: 'Wishlist', description: 'Customer product wishlist' },
      {
        name: 'Notifications',
        description: 'Push notification tokens and notification history',
      },
      {
        name: 'Payments',
        description: 'Stripe payment intents and webhook processing',
      },
      {
        name: 'Promo Codes',
        description: 'Promotional code management (Admin only)',
      },
      {
        name: 'Vendor Profile',
        description: 'Vendor store profile and onboarding status',
      },
      {
        name: 'Vendor Payouts',
        description: 'Stripe Connect earnings and payout history',
      },
      { name: 'Analytics', description: 'Vendor sales analytics and reporting' },
      { name: 'Banners', description: 'Homepage banner management (Admin only)' },
      { name: 'Admin', description: 'Platform administration (Admin only)' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
};

/**
 * Build the Swagger spec on demand. Called only inside the `if (env.isDev)` block
 * in app.ts so the spec (and swagger-jsdoc processing) never runs in production.
 * Note: *.validation.ts files are intentionally excluded from the `apis` glob —
 * no inline @openapi component schemas are defined there; all schemas are documented
 * inline within the route JSDoc blocks.
 */
export function buildSwaggerSpec(): object {
  return swaggerJsdoc(options);
}

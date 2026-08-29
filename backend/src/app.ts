import express, { Application, Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import {
  dashboardAggregateLimiter,
  dashboardClientLimiter,
  globalLimiter,
} from './middleware/rateLimiter';
import { ApiResponse } from './utils/apiResponse';
import { corsOptions } from './middleware/cors';
import { csrfProtection } from './middleware/csrf';

const app: Application = express();

// ---------------------
// Security & Parsing
// ---------------------
// Strict Helmet for all routes
app.use(helmet());
app.use(cors(corsOptions));
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(csrfProtection);

// ---------------------
// Stripe Webhooks (must be before globalLimiter so Stripe retries are never throttled)
// ---------------------
import { paymentWebhookRouter } from './modules/payment/payment.routes';
import { vendorPayoutWebhookRouter } from './modules/vendor-payout/vendor-payout.routes';
app.use('/api/v1/payments', paymentWebhookRouter);
app.use('/api/v1/vendor-payouts', vendorPayoutWebhookRouter);

// ---------------------
// Rate Limiting
// ---------------------
app.use(globalLimiter);
app.use(dashboardClientLimiter);
app.use(dashboardAggregateLimiter);

// ---------------------
// Logging
// ---------------------
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ---------------------
// API Documentation (dev only)
// ---------------------
if (env.isDev) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const swaggerUi = require('swagger-ui-express');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { buildSwaggerSpec } = require('./config/swagger');
  const swaggerSpec = buildSwaggerSpec();

  // Relax CSP and COEP only for the docs route — Swagger UI needs inline scripts
  // and loads assets from cdn.jsdelivr.net. Keeping this scoped prevents the
  // looser policy from affecting API JSON responses served to clients.
  app.use(
    '/api/docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Multi-Vendor E-Commerce API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
      },
    })
  );
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ---------------------
// Health Check
// ---------------------
app.get('/api/health', (_req, res) => {
  ApiResponse.success(
    res,
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    },
    'Server is running'
  );
});

// ---------------------
// API Routes
// ---------------------
import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/category/category.routes';
import productRoutes from './modules/product/product.routes';
import cartRoutes from './modules/cart/cart.routes';
import addressRoutes from './modules/address/address.routes';
import orderRoutes from './modules/order/order.routes';
import notificationRoutes from './modules/notification/notification.routes';
import reviewRoutes from './modules/review/review.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import promoRoutes from './modules/promo/promo.routes';
import vendorProfileRoutes from './modules/vendor-profile/vendor-profile.routes';
import vendorPayoutRoutes from './modules/vendor-payout/vendor-payout.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import adminRoutes from './modules/admin/admin.routes';
import bannerRoutes from './modules/banner/banner.routes';
import paymentRoutes from './modules/payment/payment.routes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/promo-codes', promoRoutes);
app.use('/api/v1/vendor-profile', vendorProfileRoutes);
app.use('/api/v1/vendor-payouts', vendorPayoutRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/banners', bannerRoutes);
app.use('/api/v1/payments', paymentRoutes);

// ---------------------
// Error Handling
// ---------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

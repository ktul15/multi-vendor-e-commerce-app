import express, { Application, Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalLimiter, authLimiter } from './middleware/rateLimiter';
import { ApiResponse } from './utils/apiResponse';

const app: Application = express();

// ---------------------
// Security & Parsing
// ---------------------
app.use(helmet());
app.use(
  cors({
    origin: [
      env.STOREFRONT_URL,
      env.VENDOR_DASHBOARD_URL,
      env.ADMIN_DASHBOARD_URL,
    ],
    credentials: true,
  })
);
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// ---------------------
// Stripe Webhooks (must be before globalLimiter so Stripe retries are never throttled)
// ---------------------
import paymentRoutes from './modules/payment/payment.routes';
import { vendorPayoutWebhookRouter } from './modules/vendor-payout/vendor-payout.routes';
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/vendor-payouts', vendorPayoutWebhookRouter);

// ---------------------
// Rate Limiting
// ---------------------
app.use(globalLimiter);

// ---------------------
// Logging
// ---------------------
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
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

app.use('/api/v1/auth', authLimiter, authRoutes);
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

// ---------------------
// Error Handling
// ---------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

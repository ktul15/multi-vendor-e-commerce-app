import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireApprovedVendor } from '../../middleware/requireApprovedVendor';
import { validateQuery } from '../../middleware/validate';
import {
  summaryQuerySchema,
  salesQuerySchema,
  topProductsQuerySchema,
} from './analytics.validation';
import { AnalyticsController } from './analytics.controller';

const router = Router();
const controller = new AnalyticsController();

/**
 * @openapi
 * /analytics/vendor/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Get vendor analytics summary (approved Vendors only)
 *     description: Returns total revenue, order count, and average order value for the given date range (max 366 days).
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         example: "2024-12-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Analytics summary fetched
 *               data:
 *                 totalRevenue: 12500.00
 *                 orderCount: 85
 *                 averageOrderValue: 147.06
 *       400:
 *         description: Invalid date range (max 366 days)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — must be an approved vendor
 */
router.get(
  '/vendor/summary',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(summaryQuerySchema),
  controller.summary
);

/**
 * @openapi
 * /analytics/vendor/sales:
 *   get:
 *     tags: [Analytics]
 *     summary: Get vendor sales chart data (approved Vendors only)
 *     description: Returns time-series sales data grouped by day, week, or month.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Sales time series
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Sales data fetched
 *               data:
 *                 - date: "2024-01-01"
 *                   revenue: 250.00
 *                   orders: 3
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/vendor/sales',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(salesQuerySchema),
  controller.sales
);

/**
 * @openapi
 * /analytics/vendor/top-products:
 *   get:
 *     tags: [Analytics]
 *     summary: Get top-selling products (approved Vendors only)
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 20, default: 5 }
 *         description: Number of top products to return
 *     responses:
 *       200:
 *         description: Top products by revenue
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Top products fetched
 *               data:
 *                 - productId: "uuid"
 *                   productName: Wireless Headphones
 *                   revenue: 2000.00
 *                   unitsSold: 20
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/vendor/top-products',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(topProductsQuerySchema),
  controller.topProducts
);

export default router;

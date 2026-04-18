import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireApprovedVendor } from '../../middleware/requireApprovedVendor';
import {
  validate,
  validateParams,
  validateQuery,
} from '../../middleware/validate';
import {
  getEarningsQuerySchema,
  getPayoutsQuerySchema,
  updateCommissionRateSchema,
  vendorIdParamSchema,
} from './vendor-payout.validation';
import { VendorPayoutController } from './vendor-payout.controller';

const controller = new VendorPayoutController();

/**
 * @openapi
 * /vendor-payouts/webhook:
 *   post:
 *     tags: [Vendor Payouts]
 *     summary: Stripe Connect webhook (Stripe servers only)
 *     description: >
 *       Receives Stripe Connect webhook events (e.g. `account.updated`, `payout.paid`).
 *       **Do not call this endpoint directly** — it is for Stripe's servers only.
 *       This route is mounted before the global rate limiter so Stripe retries are never throttled.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe Event object
 *     responses:
 *       200:
 *         description: Event received
 *       400:
 *         description: Invalid Stripe signature
 */
// Webhook-only router — mounted before the global rate limiter in app.ts
// so Stripe retries are never throttled.
export const vendorPayoutWebhookRouter = Router();
vendorPayoutWebhookRouter.post('/webhook', controller.webhook);

// API router — mounted after the global rate limiter in app.ts
const router = Router();

/**
 * @openapi
 * /vendor-payouts/connect/onboard:
 *   post:
 *     tags: [Vendor Payouts]
 *     summary: Start Stripe Connect onboarding (approved Vendors only)
 *     description: Generates a Stripe Connect onboarding URL. The vendor is redirected to Stripe to complete account setup.
 *     responses:
 *       200:
 *         description: Onboarding URL
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Onboarding link generated
 *               data:
 *                 url: "https://connect.stripe.com/setup/s/..."
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — must be an approved vendor
 *       404:
 *         description: Vendor profile not found
 */
// ─── Vendor: Connect onboarding ─────────────────────────────────────
router.post(
  '/connect/onboard',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  controller.onboard
);

/**
 * @openapi
 * /vendor-payouts/connect/onboard/refresh:
 *   get:
 *     tags: [Vendor Payouts]
 *     summary: Refresh the Stripe Connect onboarding link (approved Vendors only)
 *     description: Returns a fresh onboarding URL if the previous one expired.
 *     responses:
 *       200:
 *         description: Refreshed onboarding URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — must be an approved vendor
 *       404:
 *         description: Vendor profile not found
 */
router.get(
  '/connect/onboard/refresh',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  controller.refreshOnboarding
);

/**
 * @openapi
 * /vendor-payouts/connect/status:
 *   get:
 *     tags: [Vendor Payouts]
 *     summary: Get Stripe Connect account status (Vendor only)
 *     description: Returns whether the vendor's Stripe Connect account is fully onboarded and enabled for payouts.
 *     responses:
 *       200:
 *         description: Connect account status
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Connect status fetched
 *               data:
 *                 connected: true
 *                 chargesEnabled: true
 *                 payoutsEnabled: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR role required
 */
router.get(
  '/connect/status',
  authenticate,
  authorize('VENDOR'),
  controller.connectStatus
);

/**
 * @openapi
 * /vendor-payouts/earnings:
 *   get:
 *     tags: [Vendor Payouts]
 *     summary: List vendor earnings (approved Vendors only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, TRANSFERRED, FAILED, REVERSED]
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated earnings list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// ─── Vendor: Earnings & Payouts ─────────────────────────────────────
router.get(
  '/earnings',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(getEarningsQuerySchema),
  controller.earnings
);

/**
 * @openapi
 * /vendor-payouts/earnings/summary:
 *   get:
 *     tags: [Vendor Payouts]
 *     summary: Get earnings summary (approved Vendors only)
 *     description: Returns total lifetime earnings, pending balance, and transferred amount.
 *     responses:
 *       200:
 *         description: Earnings summary
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Earnings summary fetched
 *               data:
 *                 totalEarnings: 1500.00
 *                 pendingBalance: 200.00
 *                 transferred: 1300.00
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — must be an approved vendor
 *       404:
 *         description: Vendor profile not found
 */
router.get(
  '/earnings/summary',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  controller.earningsSummary
);

/**
 * @openapi
 * /vendor-payouts/payouts:
 *   get:
 *     tags: [Vendor Payouts]
 *     summary: List payouts (approved Vendors only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED]
 *     responses:
 *       200:
 *         description: Paginated payouts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/payouts',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(getPayoutsQuerySchema),
  controller.payouts
);

/**
 * @openapi
 * /vendor-payouts/admin/commission/{vendorId}:
 *   patch:
 *     tags: [Vendor Payouts]
 *     summary: Set a vendor's commission rate (Admin only)
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Vendor user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commissionRate]
 *             properties:
 *               commissionRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Platform commission percentage (0-100)
 *                 example: 15
 *     responses:
 *       200:
 *         description: Commission rate updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Vendor not found
 */
// ─── Admin: Commission management ───────────────────────────────────
router.patch(
  '/admin/commission/:vendorId',
  authenticate,
  authorize('ADMIN'),
  validateParams(vendorIdParamSchema),
  validate(updateCommissionRateSchema),
  controller.updateCommissionRate
);

export default router;

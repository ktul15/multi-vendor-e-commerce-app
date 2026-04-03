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

// Webhook-only router — mounted before the global rate limiter in app.ts
// so Stripe retries are never throttled.
export const vendorPayoutWebhookRouter = Router();
vendorPayoutWebhookRouter.post('/webhook', controller.webhook);

// API router — mounted after the global rate limiter in app.ts
const router = Router();

// ─── Vendor: Connect onboarding ─────────────────────────────────────
router.post(
  '/connect/onboard',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  controller.onboard
);

router.get(
  '/connect/onboard/refresh',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  controller.refreshOnboarding
);

router.get(
  '/connect/status',
  authenticate,
  authorize('VENDOR'),
  controller.connectStatus
);

// ─── Vendor: Earnings & Payouts ─────────────────────────────────────
router.get(
  '/earnings',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(getEarningsQuerySchema),
  controller.earnings
);

router.get(
  '/earnings/summary',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  controller.earningsSummary
);

router.get(
  '/payouts',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(getPayoutsQuerySchema),
  controller.payouts
);

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

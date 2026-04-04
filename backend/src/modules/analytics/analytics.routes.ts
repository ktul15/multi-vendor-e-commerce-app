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

router.get(
  '/vendor/summary',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(summaryQuerySchema),
  controller.summary
);

router.get(
  '/vendor/sales',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(salesQuerySchema),
  controller.sales
);

router.get(
  '/vendor/top-products',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(topProductsQuerySchema),
  controller.topProducts
);

export default router;

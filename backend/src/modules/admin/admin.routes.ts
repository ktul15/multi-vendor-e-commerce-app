import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery, validateParams } from '../../middleware/validate';
import { AdminController } from './admin.controller';
import {
  listUsersQuerySchema,
  listVendorsQuerySchema,
  listProductsQuerySchema,
  listOrdersQuerySchema,
  revenueQuerySchema,
  userIdParamSchema,
  vendorProfileIdParamSchema,
  productIdParamSchema,
  updateCommissionSchema,
  updateVendorCommissionSchema,
} from './admin.validation';

const router = Router();
const controller = new AdminController();

// All admin routes require a valid JWT and ADMIN role
router.use(authenticate, authorize('ADMIN'));

// Dashboard
router.get('/dashboard', controller.getDashboard);

// User management
router.get('/users', validateQuery(listUsersQuerySchema), controller.listUsers);
router.patch(
  '/users/:userId/ban',
  validateParams(userIdParamSchema),
  controller.banUser
);
router.patch(
  '/users/:userId/unban',
  validateParams(userIdParamSchema),
  controller.unbanUser
);

// Vendor management
router.get('/vendors', validateQuery(listVendorsQuerySchema), controller.listVendors);
router.patch(
  '/vendors/:vendorProfileId/approve',
  validateParams(vendorProfileIdParamSchema),
  controller.approveVendor
);
router.patch(
  '/vendors/:vendorProfileId/reject',
  validateParams(vendorProfileIdParamSchema),
  controller.rejectVendor
);
router.patch(
  '/vendors/:vendorProfileId/suspend',
  validateParams(vendorProfileIdParamSchema),
  controller.suspendVendor
);
router.patch(
  '/vendors/:vendorProfileId/commission',
  validateParams(vendorProfileIdParamSchema),
  validate(updateVendorCommissionSchema),
  controller.setVendorCommission
);

// Product moderation
router.get('/products', validateQuery(listProductsQuerySchema), controller.listProducts);
router.patch(
  '/products/:productId/activate',
  validateParams(productIdParamSchema),
  controller.activateProduct
);
router.patch(
  '/products/:productId/deactivate',
  validateParams(productIdParamSchema),
  controller.deactivateProduct
);
router.delete(
  '/products/:productId',
  validateParams(productIdParamSchema),
  controller.deleteProduct
);

// Orders
router.get('/orders', validateQuery(listOrdersQuerySchema), controller.listAllOrders);

// Revenue reports
router.get('/revenue', validateQuery(revenueQuerySchema), controller.getPlatformRevenue);

// Commission settings
router.get('/commission', controller.getDefaultCommission);
router.patch(
  '/commission',
  validate(updateCommissionSchema),
  controller.setDefaultCommission
);

export default router;

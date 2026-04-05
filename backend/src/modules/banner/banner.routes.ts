import { Router } from 'express';
import { Role } from '../../generated/prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery, validateParams } from '../../middleware/validate';
import upload, { withUpload } from '../../middleware/upload';
import { BannerController } from './banner.controller';
import {
  createBannerSchema,
  updateBannerSchema,
  bannerIdParamSchema,
  listBannersQuerySchema,
} from './banner.validation';

const router = Router();
const controller = new BannerController();

// Public storefront endpoint — no authentication required
// Must be declared before router.use(authenticate) so it remains unprotected
router.get('/', controller.getPublicBanners);

// All routes below require a valid JWT and ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

// Requires multipart/form-data with an 'image' file field.
// Sending application/json will result in a missing-image 400 error.
router.post(
  '/',
  withUpload(upload.single('image')),
  validate(createBannerSchema),
  controller.createBanner
);

router.get('/all', validateQuery(listBannersQuerySchema), controller.listBanners);

router.get('/:id', validateParams(bannerIdParamSchema), controller.getBannerById);

// Optionally accepts a new 'image' file via multipart/form-data to replace the existing image.
// If no image is provided, the existing imageUrl is preserved.
router.put(
  '/:id',
  validateParams(bannerIdParamSchema),
  withUpload(upload.single('image')),
  validate(updateBannerSchema),
  controller.updateBanner
);

router.delete('/:id', validateParams(bannerIdParamSchema), controller.deleteBanner);

export default router;

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

/**
 * @openapi
 * /banners:
 *   get:
 *     tags: [Banners]
 *     summary: Get active banners for the storefront
 *     description: Returns only active banners, ordered by position. No authentication required.
 *     security: []
 *     responses:
 *       200:
 *         description: Active banners
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Banners fetched
 *               data:
 *                 - id: "uuid"
 *                   title: Summer Sale
 *                   imageUrl: "https://cdn.example.com/banner.jpg"
 *                   linkUrl: "https://example.com/sale"
 *                   position: 0
 */
// Public storefront endpoint — no authentication required
// Must be declared before router.use(authenticate) so it remains unprotected
router.get('/', controller.getPublicBanners);

// All routes below require a valid JWT and ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

/**
 * @openapi
 * /banners:
 *   post:
 *     tags: [Banners]
 *     summary: Create a banner (Admin only)
 *     description: >
 *       Send as `multipart/form-data`. The `image` file field is required.
 *       Sending `application/json` will result in a 400 missing-image error.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, image]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: Summer Sale
 *               linkUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/sale"
 *               position:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: Display order (lower = higher priority)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Banner image (JPEG/PNG, required)
 *     responses:
 *       201:
 *         description: Banner created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error or missing image
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 */
// Requires multipart/form-data with an 'image' file field.
// Sending application/json will result in a missing-image 400 error.
router.post(
  '/',
  withUpload(upload.single('image')),
  validate(createBannerSchema),
  controller.createBanner
);

/**
 * @openapi
 * /banners/all:
 *   get:
 *     tags: [Banners]
 *     summary: List all banners with pagination (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *         description: Filter by active/inactive status
 *     responses:
 *       200:
 *         description: Paginated banner list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/all', validateQuery(listBannersQuerySchema), controller.listBanners);

/**
 * @openapi
 * /banners/{id}:
 *   get:
 *     tags: [Banners]
 *     summary: Get a banner by ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Banner detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Banner not found
 */
router.get('/:id', validateParams(bannerIdParamSchema), controller.getBannerById);

/**
 * @openapi
 * /banners/{id}:
 *   put:
 *     tags: [Banners]
 *     summary: Update a banner (Admin only)
 *     description: >
 *       Send as `multipart/form-data`. Optionally include a new `image` file to replace the existing one.
 *       If no image is provided, the existing `imageUrl` is preserved. At least one field must be provided.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               linkUrl: { type: string, format: uri }
 *               position: { type: integer, minimum: 0 }
 *               isActive: { type: boolean }
 *               image: { type: string, format: binary, description: "Optional — replaces existing image" }
 *     responses:
 *       200:
 *         description: Banner updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Banner not found
 */
// Optionally accepts a new 'image' file via multipart/form-data to replace the existing image.
// If no image is provided, the existing imageUrl is preserved.
router.put(
  '/:id',
  validateParams(bannerIdParamSchema),
  withUpload(upload.single('image')),
  validate(updateBannerSchema),
  controller.updateBanner
);

/**
 * @openapi
 * /banners/{id}:
 *   delete:
 *     tags: [Banners]
 *     summary: Delete a banner (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Banner deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Banner not found
 */
router.delete('/:id', validateParams(bannerIdParamSchema), controller.deleteBanner);

export default router;

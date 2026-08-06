import { NextFunction, Request, Response, Router } from 'express';
import { Role } from '../../generated/prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import {
  validate,
  validateQuery,
  validateParams,
} from '../../middleware/validate';
import upload, { withUpload } from '../../middleware/upload';
import { BannerController } from './banner.controller';
import {
  createBannerSchema,
  updateBannerSchema,
  bannerIdParamSchema,
  listBannersQuerySchema,
} from './banner.validation';
import { ApiError } from '../../utils/apiError';

const router = Router();
const controller = new BannerController();

const requireBannerUpdate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.file && Object.keys(req.body).length === 0) {
    next(ApiError.badRequest('At least one banner field or image is required'));
    return;
  }
  next();
};

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
 *       Sending `application/json` will result in a 400 missing-image error. A successful upload is
 *       rolled back with an observable warning if the database create fails.
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
 *                 description: Exactly one JPEG, PNG, or WebP image up to 5 MB.
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
 *       413:
 *         description: Uploaded image exceeds the 5 MB limit
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
 *       400:
 *         description: Invalid pagination or active-state filter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/all',
  validateQuery(listBannersQuerySchema),
  controller.listBanners
);

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
 *       400:
 *         description: Invalid banner ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Banner not found
 */
router.get(
  '/:id',
  validateParams(bannerIdParamSchema),
  controller.getBannerById
);

/**
 * @openapi
 * /banners/{id}:
 *   put:
 *     tags: [Banners]
 *     summary: Update a banner (Admin only)
 *     description: >
 *       Send text-only updates as JSON or multipart. A multipart request may contain exactly one optional
 *       `image` file, including an image-only update. At least one field or image is required. New uploads
 *       roll back if the DB update fails; replaced media cleanup is observable and best effort after commit.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 200 }
 *               linkUrl: { type: string, format: uri, nullable: true, description: "Set null to clear the link" }
 *               position: { type: integer, minimum: 0 }
 *               isActive: { type: boolean }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               linkUrl:
 *                 description: Send an absolute URI, or an empty string to clear the link.
 *                 oneOf:
 *                   - type: string
 *                     format: uri
 *                   - type: string
 *                     enum: ['']
 *               position: { type: integer, minimum: 0 }
 *               isActive: { type: boolean }
 *               image: { type: string, format: binary, description: "Optional single JPEG, PNG, or WebP image up to 5 MB; replaces existing image" }
 *     responses:
 *       200:
 *         description: Banner updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Banner not found
 *       413:
 *         description: Uploaded image exceeds the 5 MB limit
 */
// Optionally accepts a new 'image' file via multipart/form-data to replace the existing image.
// If no image is provided, the existing imageUrl is preserved.
router.put(
  '/:id',
  validateParams(bannerIdParamSchema),
  withUpload(upload.single('image')),
  validate(updateBannerSchema),
  requireBannerUpdate,
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
 *       204:
 *         description: Banner deleted; response body is empty. Media cleanup is observable and best effort after DB commit.
 *       400:
 *         description: Invalid banner ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Banner not found
 */
router.delete(
  '/:id',
  validateParams(bannerIdParamSchema),
  controller.deleteBanner
);

export default router;

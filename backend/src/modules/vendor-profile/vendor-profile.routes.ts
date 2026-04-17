import { Router } from 'express';
import * as vendorProfileController from './vendor-profile.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireApprovedVendor } from '../../middleware/requireApprovedVendor';
import { validate } from '../../middleware/validate';
import { updateVendorProfileSchema } from './vendor-profile.validation';
import { withUpload } from '../../middleware/upload';
import upload from '../../middleware/upload';
import { Role } from '../../generated/prisma/client';

const router = Router();

// All vendor-profile routes require VENDOR role
router.use(authenticate, authorize(Role.VENDOR));

/**
 * @openapi
 * /vendor-profile/me:
 *   get:
 *     tags: [Vendor Profile]
 *     summary: Get the current vendor's profile
 *     description: Any vendor can view their own profile regardless of approval status.
 *     responses:
 *       200:
 *         description: Vendor profile
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Vendor profile fetched
 *               data:
 *                 id: "uuid"
 *                 storeName: "Jane's Boutique"
 *                 description: "Quality handmade goods"
 *                 status: PENDING
 *                 logoUrl: null
 *                 bannerUrl: null
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR role required
 */
// GET /vendor-profile/me — any vendor can view their own profile (even PENDING)
router.get('/me', vendorProfileController.getProfile);

/**
 * @openapi
 * /vendor-profile/me:
 *   put:
 *     tags: [Vendor Profile]
 *     summary: Update the vendor profile (approved vendors only)
 *     description: >
 *       Send as `multipart/form-data`. Include `logo` and/or `banner` file fields to upload images.
 *       Text fields (`storeName`, `description`) are included as form fields.
 *       At least one field or file must be provided.
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Jane's Boutique
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Quality handmade goods from local artisans
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Store logo image (JPEG/PNG)
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Store banner image (JPEG/PNG)
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — must be an approved vendor
 */
// PUT /vendor-profile/me — only approved vendors can update their profile
router.put(
  '/me',
  requireApprovedVendor,
  withUpload(
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ])
  ),
  validate(updateVendorProfileSchema),
  vendorProfileController.updateProfile
);

export default router;

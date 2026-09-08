import { NextFunction, Request, Response, Router } from 'express';
import * as vendorProfileController from './vendor-profile.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEditableVendorProfile } from '../../middleware/requireApprovedVendor';
import { validate } from '../../middleware/validate';
import { updateVendorProfileSchema } from './vendor-profile.validation';
import { withUpload } from '../../middleware/upload';
import upload from '../../middleware/upload';
import { Role } from '../../generated/prisma/client';
import { ApiError } from '../../utils/apiError';

const router = Router();

const requireVendorProfileUpdate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const hasFile = Boolean(files?.logo?.length || files?.banner?.length);
  if (!hasFile && Object.keys(req.body).length === 0) {
    next(
      ApiError.badRequest(
        'At least one vendor profile field, logo, or banner is required'
      )
    );
    return;
  }
  next();
};

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
 *                 userId: "uuid"
 *                 storeName: "Jane's Boutique"
 *                 description: "Quality handmade goods"
 *                 status: PENDING
 *                 storeLogo: null
 *                 storeBanner: null
 *                 user:
 *                   name: Jane Vendor
 *                   email: jane@example.com
 *                   avatar: null
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR role required
 *       404:
 *         description: Vendor profile not found
 */
// GET /vendor-profile/me — any vendor can view their own profile (even PENDING)
router.get('/me', vendorProfileController.getProfile);

/**
 * @openapi
 * /vendor-profile/me:
 *   put:
 *     tags: [Vendor Profile]
 *     summary: Update the vendor profile (pending or approved vendors only)
 *     description: >
 *       Send text-only updates as JSON or multipart. Multipart accepts at most one `logo` and one `banner`.
 *       File-only and mixed updates are valid; a true no-op is rejected. Each file must be JPEG, PNG, or WebP
 *       and at most 5 MB. New uploads roll back on DB failure; replaced-media cleanup is observable and best effort.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               storeName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             minProperties: 1
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
 *                 description: Optional single JPEG, PNG, or WebP image up to 5 MB
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Optional single JPEG, PNG, or WebP image up to 5 MB
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
 *         description: Forbidden — vendor profile cannot be edited in current status
 *       404:
 *         description: Vendor profile not found
 *       409:
 *         description: Store name is already in use
 *       413:
 *         description: An uploaded image exceeds the 5 MB limit
 */
// PUT /vendor-profile/me — pending and approved vendors can update their profile
router.put(
  '/me',
  requireEditableVendorProfile,
  withUpload(
    upload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ])
  ),
  validate(updateVendorProfileSchema),
  requireVendorProfileUpdate,
  vendorProfileController.updateProfile
);

export default router;

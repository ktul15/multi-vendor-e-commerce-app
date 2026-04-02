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

// GET /vendor-profile/me — any vendor can view their own profile (even PENDING)
router.get('/me', vendorProfileController.getProfile);

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

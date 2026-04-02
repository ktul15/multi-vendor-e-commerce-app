import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { VendorProfileStatus } from '../generated/prisma/client';

/**
 * Middleware that ensures the authenticated vendor has an APPROVED profile.
 * Must be used AFTER `authenticate` and `authorize('VENDOR')`.
 *
 * Attaches the full vendor profile to `req.vendorProfile` so downstream
 * handlers can use it without a duplicate DB query.
 *
 * Returns 403 with a status-specific message so the client can show
 * appropriate UI (e.g. "Your application is under review").
 */
export const requireApprovedVendor = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      next(ApiError.notFound('Vendor profile not found'));
      return;
    }

    if (profile.status !== VendorProfileStatus.APPROVED) {
      const messages: Record<
        Exclude<VendorProfileStatus, 'APPROVED'>,
        string
      > = {
        [VendorProfileStatus.PENDING]:
          'Your vendor application is under review',
        [VendorProfileStatus.REJECTED]:
          'Your vendor application has been rejected',
        [VendorProfileStatus.SUSPENDED]:
          'Your vendor account has been suspended',
      };
      next(
        ApiError.forbidden(
          messages[
            profile.status as Exclude<VendorProfileStatus, 'APPROVED'>
          ] ?? 'Vendor account is not approved'
        )
      );
      return;
    }

    // Attach profile so downstream handlers skip a duplicate query
    req.vendorProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

import { Response } from 'express';
import { AuthRequest } from '../../types';
import * as vendorProfileService from './vendor-profile.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';

export const getProfile = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await vendorProfileService.getProfile(userId);
    ApiResponse.success(res, profile, 'Vendor profile fetched successfully');
  }
);

export const updateProfile = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    // vendorProfile is attached by requireApprovedVendor middleware
    const existing = req.vendorProfile!;
    const files = req.files as
      | Record<string, { buffer: Buffer }[]>
      | undefined;
    const updatedProfile = await vendorProfileService.updateProfile(
      userId,
      existing,
      req.body,
      files
    );
    ApiResponse.success(
      res,
      updatedProfile,
      'Vendor profile updated successfully'
    );
  }
);

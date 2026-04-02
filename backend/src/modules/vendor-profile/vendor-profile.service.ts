import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import {
  uploadImage,
  deleteImage,
  UploadResult,
} from '../../utils/cloudinaryUpload';
import { UpdateVendorProfileInput } from './vendor-profile.validation';
import { VendorProfile } from '../../generated/prisma/client';

interface UploadedFile {
  buffer: Buffer;
}

const CLOUDINARY_FOLDER = 'vendor-profiles';

/**
 * Get the vendor profile for the authenticated vendor.
 * Includes basic user info (name, email).
 */
export const getProfile = async (userId: string) => {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true, avatar: true },
      },
    },
  });

  if (!profile) {
    throw ApiError.notFound('Vendor profile not found');
  }

  return profile;
};

/**
 * Update vendor profile fields (storeName, description) and optionally
 * upload new logo/banner images via Cloudinary.
 *
 * Image upload is atomic: new images are uploaded first, DB is updated,
 * and only then are old images deleted. If the DB update fails, newly
 * uploaded images are rolled back.
 */
export const updateProfile = async (
  userId: string,
  existing: VendorProfile,
  data: UpdateVendorProfileInput,
  files?: { logo?: UploadedFile[]; banner?: UploadedFile[] }
): Promise<VendorProfile> => {
  const updateData: Record<string, unknown> = {};

  if (data.storeName !== undefined) {
    // Check storeName uniqueness (only if changing)
    if (data.storeName !== existing.storeName) {
      const duplicate = await prisma.vendorProfile.findFirst({
        where: { storeName: data.storeName, userId: { not: userId } },
        select: { id: true },
      });
      if (duplicate) {
        throw ApiError.conflict('A store with this name already exists');
      }
    }
    updateData.storeName = data.storeName;
  }
  if (data.description !== undefined)
    updateData.description = data.description || null;

  // Track newly uploaded images for rollback on DB failure
  const newUploads: UploadResult[] = [];

  try {
    // Upload logo if provided
    if (files?.logo?.[0]) {
      const result = await uploadImage(
        files.logo[0].buffer,
        CLOUDINARY_FOLDER
      );
      newUploads.push(result);
      updateData.storeLogo = result.url;
      updateData.storeLogoPublicId = result.publicId;
    }

    // Upload banner if provided
    if (files?.banner?.[0]) {
      const result = await uploadImage(
        files.banner[0].buffer,
        CLOUDINARY_FOLDER
      );
      newUploads.push(result);
      updateData.storeBanner = result.url;
      updateData.storeBannerPublicId = result.publicId;
    }

    if (Object.keys(updateData).length === 0) {
      throw ApiError.badRequest('No fields to update');
    }

    const updated = await prisma.vendorProfile.update({
      where: { userId },
      data: updateData,
    });

    // DB update succeeded — now safe to delete old images (best-effort)
    if (files?.logo?.[0] && existing.storeLogoPublicId) {
      safeDeleteImage(existing.storeLogoPublicId);
    }
    if (files?.banner?.[0] && existing.storeBannerPublicId) {
      safeDeleteImage(existing.storeBannerPublicId);
    }

    return updated;
  } catch (error) {
    // Rollback: clean up newly uploaded images if DB update failed
    for (const upload of newUploads) {
      try {
        await deleteImage(upload.publicId);
      } catch {
        // Best-effort cleanup
      }
    }
    throw error;
  }
};

/**
 * Delete an image from Cloudinary by publicId, swallowing errors
 * so a failed cleanup doesn't block the profile update.
 */
const safeDeleteImage = async (publicId: string): Promise<void> => {
  try {
    await deleteImage(publicId);
  } catch {
    // Swallow — old image cleanup is best-effort
  }
};

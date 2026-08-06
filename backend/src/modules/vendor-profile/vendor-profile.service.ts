import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { uploadImage, UploadResult } from '../../utils/cloudinaryUpload';
import { UpdateVendorProfileInput } from './vendor-profile.validation';
import { Prisma, VendorProfileStatus } from '../../generated/prisma/client';
import { cleanupMediaBestEffort } from '../../utils/mediaCleanup';

interface UploadedFile {
  buffer: Buffer;
}

const CLOUDINARY_FOLDER = 'vendor-profiles';
const vendorProfileSelect = {
  id: true,
  userId: true,
  storeName: true,
  description: true,
  status: true,
  storeLogo: true,
  storeBanner: true,
} satisfies Prisma.VendorProfileSelect;

/**
 * Get the vendor profile for the authenticated vendor.
 * Includes basic user info (name, email).
 */
export const getProfile = async (userId: string) => {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: {
      ...vendorProfileSelect,
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
  data: UpdateVendorProfileInput,
  files?: { logo?: UploadedFile[]; banner?: UploadedFile[] }
) => {
  const updateData: Record<string, unknown> = {};

  if (data.storeName !== undefined) {
    updateData.storeName = data.storeName;
  }
  if (data.description !== undefined)
    updateData.description = data.description || null;

  // Track newly uploaded images for rollback on DB failure
  const newUploads: UploadResult[] = [];

  try {
    // Upload logo if provided
    if (files?.logo?.[0]) {
      const result = await uploadImage(files.logo[0].buffer, CLOUDINARY_FOLDER);
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

    const { updated, replacedLogoId, replacedBannerId } =
      await prisma.$transaction(async (tx) => {
        const existing = await lockVendorProfile(tx, userId);
        if (!existing) throw ApiError.notFound('Vendor profile not found');
        if (
          existing.status === VendorProfileStatus.REJECTED ||
          existing.status === VendorProfileStatus.SUSPENDED
        ) {
          throw ApiError.forbidden(
            'Vendor profile cannot be edited in its current status'
          );
        }

        return {
          updated: await tx.vendorProfile.update({
            where: { userId },
            data: updateData,
            select: vendorProfileSelect,
          }),
          replacedLogoId: files?.logo?.[0] ? existing.storeLogoPublicId : null,
          replacedBannerId: files?.banner?.[0]
            ? existing.storeBannerPublicId
            : null,
        };
      });

    // DB update succeeded — now safe to delete old images (best-effort)
    if (replacedLogoId) {
      await cleanupMediaBestEffort(
        replacedLogoId,
        'vendor profile logo replacement'
      );
    }
    if (replacedBannerId) {
      await cleanupMediaBestEffort(
        replacedBannerId,
        'vendor profile banner replacement'
      );
    }

    return updated;
  } catch (error) {
    // Rollback: clean up newly uploaded images if DB update failed
    for (const upload of newUploads) {
      await cleanupMediaBestEffort(
        upload.publicId,
        'vendor profile update rollback'
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw ApiError.conflict('A store with this name already exists', [
        { field: 'storeName', message: 'Store name must be unique' },
      ]);
    }
    throw error;
  }
};

const lockVendorProfile = async (
  tx: Prisma.TransactionClient,
  userId: string
) => {
  const rows = await tx.$queryRaw<
    Array<{
      status: VendorProfileStatus;
      storeLogoPublicId: string | null;
      storeBannerPublicId: string | null;
    }>
  >`SELECT "status", "storeLogoPublicId", "storeBannerPublicId"
    FROM "vendor_profiles" WHERE "userId" = ${userId} FOR UPDATE`;
  return rows[0];
};

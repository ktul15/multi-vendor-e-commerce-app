import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/apiError';
import {
  uploadImage,
  deleteImage,
  UploadResult,
} from '../../utils/cloudinaryUpload';
import {
  CreateBannerInput,
  UpdateBannerInput,
  ListBannersQueryInput,
} from './banner.validation';

const CLOUDINARY_FOLDER = 'banners';
// Defensive cap so a misconfigured admin cannot flood the storefront response
const PUBLIC_BANNERS_LIMIT = 50;

export class BannerService {
  // ---- Public storefront endpoint ----

  async getPublicBanners() {
    return prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: PUBLIC_BANNERS_LIMIT,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        position: true,
      },
    });
  }

  // ---- Admin endpoints ----

  async listBanners(query: ListBannersQueryInput) {
    const { page, limit, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BannerWhereInput = {
      ...(isActive !== undefined && { isActive }),
    };

    const [total, items] = await Promise.all([
      prisma.banner.count({ where }),
      prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getBannerById(id: string) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) throw ApiError.notFound('Banner not found');
    return banner;
  }

  async createBanner(data: CreateBannerInput, file?: Express.Multer.File) {
    if (!file) throw ApiError.badRequest('Banner image is required');

    const newUploads: UploadResult[] = [];
    try {
      const uploaded = await uploadImage(file.buffer, CLOUDINARY_FOLDER);
      newUploads.push(uploaded);

      return await prisma.banner.create({
        data: {
          title: data.title,
          imageUrl: uploaded.url,
          imagePublicId: uploaded.publicId,
          linkUrl: data.linkUrl ?? null,
          position: data.position,
          isActive: data.isActive,
        },
      });
    } catch (err) {
      for (const u of newUploads) {
        await deleteImage(u.publicId).catch(() => {});
      }
      throw err;
    }
  }

  async updateBanner(
    id: string,
    data: UpdateBannerInput,
    file?: Express.Multer.File
  ) {
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Banner not found');

    const newUploads: UploadResult[] = [];
    try {
      const updateData: Prisma.BannerUpdateInput = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      };

      if (file) {
        const uploaded = await uploadImage(file.buffer, CLOUDINARY_FOLDER);
        newUploads.push(uploaded);
        updateData.imageUrl = uploaded.url;
        updateData.imagePublicId = uploaded.publicId;
      }

      const updated = await prisma.banner.update({
        where: { id },
        data: updateData,
      });

      // Best-effort cleanup of the old image after a successful DB update
      if (file && existing.imagePublicId) {
        await deleteImage(existing.imagePublicId).catch((err) => {
          logger.warn(`[banner] Failed to delete old image ${existing.imagePublicId}: ${err}`);
        });
      }

      return updated;
    } catch (err) {
      for (const u of newUploads) {
        await deleteImage(u.publicId).catch(() => {});
      }
      throw err;
    }
  }

  async deleteBanner(id: string) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) throw ApiError.notFound('Banner not found');

    await prisma.banner.delete({ where: { id } });

    // Best-effort cleanup after a successful DB delete
    if (banner.imagePublicId) {
      await deleteImage(banner.imagePublicId).catch((err) => {
        logger.warn(`[banner] Failed to delete image ${banner.imagePublicId}: ${err}`);
      });
    }
  }
}

export const bannerService = new BannerService();

import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { uploadImage, UploadResult } from '../../utils/cloudinaryUpload';
import { cleanupMediaBestEffort } from '../../utils/mediaCleanup';
import {
  CreateBannerInput,
  UpdateBannerInput,
  ListBannersQueryInput,
} from './banner.validation';

const CLOUDINARY_FOLDER = 'banners';
// Defensive cap so a misconfigured admin cannot flood the storefront response
const PUBLIC_BANNERS_LIMIT = 50;
const bannerSelect = {
  id: true,
  title: true,
  imageUrl: true,
  linkUrl: true,
  position: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BannerSelect;

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
        select: bannerSelect,
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
    const banner = await prisma.banner.findUnique({
      where: { id },
      select: bannerSelect,
    });
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
        select: bannerSelect,
      });
    } catch (err) {
      for (const u of newUploads) {
        await cleanupMediaBestEffort(u.publicId, 'banner create rollback');
      }
      throw err;
    }
  }

  async updateBanner(
    id: string,
    data: UpdateBannerInput,
    file?: Express.Multer.File
  ) {
    const newUploads: UploadResult[] = [];
    try {
      let uploaded: UploadResult | undefined;
      if (file) {
        uploaded = await uploadImage(file.buffer, CLOUDINARY_FOLDER);
        newUploads.push(uploaded);
      }

      const updateData: Prisma.BannerUpdateInput = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      };

      if (uploaded) {
        updateData.imageUrl = uploaded.url;
        updateData.imagePublicId = uploaded.publicId;
      }

      const { updated, replacedPublicId } = await prisma.$transaction(
        async (tx) => {
          const existing = await this.lockBanner(tx, id);
          if (!existing) throw ApiError.notFound('Banner not found');
          return {
            updated: await tx.banner.update({
              where: { id },
              data: updateData,
              select: bannerSelect,
            }),
            replacedPublicId: uploaded ? existing.imagePublicId : null,
          };
        }
      );

      if (replacedPublicId) {
        await cleanupMediaBestEffort(
          replacedPublicId,
          'banner image replacement'
        );
      }

      return updated;
    } catch (err) {
      for (const u of newUploads) {
        await cleanupMediaBestEffort(u.publicId, 'banner update rollback');
      }
      throw err;
    }
  }

  async deleteBanner(id: string) {
    const publicId = await prisma.$transaction(async (tx) => {
      const banner = await this.lockBanner(tx, id);
      if (!banner) throw ApiError.notFound('Banner not found');
      await tx.banner.delete({ where: { id } });
      return banner.imagePublicId;
    });

    if (publicId) {
      await cleanupMediaBestEffort(publicId, 'banner deletion');
    }
  }

  private async lockBanner(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<
      Array<{ id: string; imagePublicId: string | null }>
    >`SELECT "id", "imagePublicId" FROM "banners"
      WHERE "id" = ${id} FOR UPDATE`;
    return rows[0];
  }
}

export const bannerService = new BannerService();

import { prisma } from '../../config/prisma';
import slugify from 'slugify';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category.validation';
import { ApiError } from '../../utils/apiError';
import {
  deleteImage,
  uploadImage,
  UploadResult,
} from '../../utils/cloudinaryUpload';

const CLOUDINARY_FOLDER = 'categories';

export class CategoryService {
  /**
   * Get all categories.
   * Returns a nested tree structure (categories with their children).
   */
  async getAllCategories() {
    return prisma.category.findMany({
      where: {
        parentId: null, // Only fetch root categories
      },
      include: {
        children: {
          include: {
            children: true, // Fetch up to 3 levels deep if needed
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new category.
   * Auto-generates a unique slug from the name.
   */
  async createCategory(data: CreateCategoryInput, file?: Express.Multer.File) {
    const baseSlug = slugify(data.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new ApiError(404, 'Parent category not found');
      }
    }

    const newUploads: UploadResult[] = [];
    try {
      const uploaded = file
        ? await uploadImage(file.buffer, CLOUDINARY_FOLDER)
        : null;
      if (uploaded) newUploads.push(uploaded);

      return await prisma.category.create({
        data: {
          name: data.name,
          slug,
          image: uploaded?.url ?? data.image,
          parentId: data.parentId,
        },
      });
    } catch (err) {
      for (const upload of newUploads) {
        await deleteImage(upload.publicId).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Update an existing category.
   * Re-generates the slug if the name changes.
   */
  async updateCategory(
    id: string,
    data: UpdateCategoryInput,
    file?: Express.Multer.File
  ) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    let newSlug = category.slug;

    // Update slug if name changes
    if (data.name && data.name !== category.name) {
      const baseSlug = slugify(data.name, { lower: true, strict: true });
      newSlug = baseSlug;
      let counter = 1;

      while (
        (await prisma.category.findUnique({ where: { slug: newSlug } })) &&
        (await prisma.category.findUnique({ where: { slug: newSlug } }))?.id !==
          id
      ) {
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new ApiError(400, 'A category cannot be its own parent');
      }
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new ApiError(404, 'Parent category not found');
      }
    }

    const newUploads: UploadResult[] = [];
    try {
      const uploaded = file
        ? await uploadImage(file.buffer, CLOUDINARY_FOLDER)
        : null;
      if (uploaded) newUploads.push(uploaded);

      return await prisma.category.update({
        where: { id },
        data: {
          ...data,
          ...(uploaded && { image: uploaded.url }),
          slug: newSlug,
        },
      });
    } catch (err) {
      for (const upload of newUploads) {
        await deleteImage(upload.publicId).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Delete a category.
   * Checks for children and attached products before deleting.
   */
  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { children: true, products: true },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (category._count.children > 0) {
      throw new ApiError(
        400,
        'Cannot delete category with subcategories. Delete or move them first.'
      );
    }

    if (category._count.products > 0) {
      throw new ApiError(
        400,
        'Cannot delete category with attached products. Reassign them first.'
      );
    }

    await prisma.category.delete({
      where: { id },
    });
  }
}

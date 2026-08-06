import { prisma } from '../../config/prisma';
import slugify from 'slugify';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category.validation';
import { ApiError } from '../../utils/apiError';
import { deleteImage, uploadImage } from '../../utils/cloudinaryUpload';
import { logger } from '../../utils/logger';
import { Prisma } from '../../generated/prisma/client';
import { env } from '../../config/env';
import { inferManagedCategoryPublicId } from './category.media';

const CLOUDINARY_FOLDER = 'categories';
const CATEGORY_MUTATION_LOCK = 131;

type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryTreeNode[];
};

const withoutMediaId = <T extends { imagePublicId: string | null }>(
  category: T
) => {
  const { imagePublicId, ...result } = category;
  void imagePublicId;
  return result;
};

export class CategoryService {
  /** Return the complete category hierarchy at arbitrary depth. */
  async getAllCategories(): Promise<CategoryTreeNode[]> {
    const categories = await prisma.category.findMany({
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    this.assertAcyclic(categories);
    const nodes = new Map<string, CategoryTreeNode>(
      categories.map((category) => [category.id, { ...category, children: [] }])
    );
    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
      const node = nodes.get(category.id)!;
      const parent = category.parentId
        ? nodes.get(category.parentId)
        : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  }

  async createCategory(data: CreateCategoryInput, file?: Express.Multer.File) {
    const uploaded = file
      ? await uploadImage(file.buffer, CLOUDINARY_FOLDER)
      : undefined;

    try {
      const category = await prisma.$transaction(async (tx) => {
        await this.lockCategoryMutations(tx);
        if (data.parentId) {
          await this.assertValidParent(tx, undefined, data.parentId);
        }
        return tx.category.create({
          data: {
            name: data.name,
            slug: await this.uniqueSlug(tx, data.name),
            image: uploaded?.url ?? data.image,
            imagePublicId: uploaded?.publicId,
            parentId: data.parentId,
          },
        });
      });
      return withoutMediaId(category);
    } catch (error) {
      if (uploaded) await this.cleanupImage(uploaded.publicId, 'rolled back');
      throw error;
    }
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryInput,
    file?: Express.Multer.File
  ) {
    const uploaded = file
      ? await uploadImage(file.buffer, CLOUDINARY_FOLDER)
      : undefined;

    try {
      const { updated, replacedPublicId } = await prisma.$transaction(
        async (tx) => {
          await this.lockCategoryMutations(tx);
          const existing = await this.lockCategory(tx, id);
          if (!existing) throw ApiError.notFound('Category not found');

          if (data.parentId !== undefined) {
            await this.assertValidParent(tx, id, data.parentId);
          }

          const imageReplaced = Boolean(uploaded) || data.image !== undefined;
          const updateData: Prisma.CategoryUpdateInput = {
            ...(data.name !== undefined && {
              name: data.name,
              slug:
                data.name === existing.name
                  ? existing.slug
                  : await this.uniqueSlug(tx, data.name, id),
            }),
            ...(data.parentId !== undefined && {
              parent: data.parentId
                ? { connect: { id: data.parentId } }
                : { disconnect: true },
            }),
            ...(uploaded
              ? { image: uploaded.url, imagePublicId: uploaded.publicId }
              : data.image !== undefined
                ? { image: data.image, imagePublicId: null }
                : {}),
          };

          return {
            updated: await tx.category.update({
              where: { id },
              data: updateData,
            }),
            replacedPublicId: imageReplaced
              ? (existing.imagePublicId ??
                inferManagedCategoryPublicId(
                  existing.image,
                  env.CLOUDINARY_CLOUD_NAME
                ))
              : null,
          };
        }
      );

      if (replacedPublicId) {
        await this.cleanupImage(replacedPublicId, 'replaced');
      }
      return withoutMediaId(updated);
    } catch (error) {
      if (uploaded) await this.cleanupImage(uploaded.publicId, 'rolled back');
      throw error;
    }
  }

  async deleteCategory(id: string) {
    let deletedPublicId: string | null;
    try {
      deletedPublicId = await prisma.$transaction(async (tx) => {
        await this.lockCategoryMutations(tx);
        const category = await this.lockCategory(tx, id);
        if (!category) throw ApiError.notFound('Category not found');
        const counts = await tx.category.findUnique({
          where: { id },
          select: { _count: { select: { children: true, products: true } } },
        });
        if (counts!._count.children > 0) {
          throw ApiError.badRequest(
            'Cannot delete category with subcategories. Delete or move them first.'
          );
        }
        if (counts!._count.products > 0) {
          throw ApiError.badRequest(
            'Cannot delete category with attached products. Reassign them first.'
          );
        }

        await tx.category.delete({ where: { id } });
        return (
          category.imagePublicId ??
          inferManagedCategoryPublicId(
            category.image,
            env.CLOUDINARY_CLOUD_NAME
          )
        );
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw ApiError.badRequest(
          'Cannot delete category with subcategories or attached products. Remove its dependencies first.'
        );
      }
      throw error;
    }
    if (deletedPublicId) {
      await this.cleanupImage(deletedPublicId, 'deleted');
    }
  }

  private async assertValidParent(
    tx: Prisma.TransactionClient,
    categoryId: string | undefined,
    parentId: string | null
  ): Promise<void> {
    if (parentId === null) return;
    const categories = await tx.category.findMany({
      select: { id: true, parentId: true },
    });
    const parents = new Map(categories.map((item) => [item.id, item.parentId]));
    if (!parents.has(parentId))
      throw ApiError.notFound('Parent category not found');

    const visited = new Set<string>();
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === categoryId) {
        throw ApiError.badRequest(
          'A category cannot be moved beneath itself or one of its descendants'
        );
      }
      if (visited.has(cursor)) {
        throw ApiError.badRequest('The category hierarchy contains a cycle');
      }
      visited.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  }

  private async uniqueSlug(
    tx: Prisma.TransactionClient,
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (
      await tx.category.findFirst({
        where: { slug, ...(excludeId && { id: { not: excludeId } }) },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }
    return slug;
  }

  private async cleanupImage(
    publicId: string,
    reason: 'replaced' | 'deleted' | 'rolled back'
  ): Promise<void> {
    await deleteImage(publicId).catch((error) => {
      logger.warn(`[category] Failed to clean up ${reason} image ${publicId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  private async lockCategoryMutations(
    tx: Prisma.TransactionClient
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CATEGORY_MUTATION_LOCK})`;
  }

  private async lockCategory(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        image: string | null;
        imagePublicId: string | null;
      }>
    >`SELECT "id", "name", "slug", "image", "imagePublicId"
      FROM "categories" WHERE "id" = ${id} FOR UPDATE`;
    return rows[0];
  }

  private assertAcyclic(
    categories: Array<{ id: string; parentId: string | null }>
  ): void {
    const parents = new Map(categories.map((item) => [item.id, item.parentId]));
    const resolved = new Set<string>();
    for (const category of categories) {
      const path = new Set<string>();
      let cursor: string | null = category.id;
      while (cursor && !resolved.has(cursor)) {
        if (path.has(cursor)) {
          logger.error('[category] Category hierarchy contains a cycle', {
            categoryId: category.id,
            cycleAt: cursor,
          });
          throw ApiError.internal('Category hierarchy contains a cycle');
        }
        path.add(cursor);
        cursor = parents.get(cursor) ?? null;
      }
      for (const id of path) resolved.add(id);
    }
  }
}

import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { inferManagedCategoryPublicId } from '../modules/category/category.media';

const apply = process.argv.includes('--apply');

type ReconciliationSummary = {
  mode: 'apply' | 'dry-run';
  candidates: number;
  owned: number;
  reconciled: number;
  concurrentlyChanged: number;
  skippedAsExternalOrAmbiguous: number;
};

export async function reconcileCategoryMedia(
  shouldApply = apply
): Promise<ReconciliationSummary> {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME is required to reconcile category media safely'
    );
  }

  const candidates = await prisma.category.findMany({
    where: { imagePublicId: null, image: { not: null } },
    select: { id: true, image: true },
  });
  const owned = candidates.flatMap((category) => {
    const publicId = inferManagedCategoryPublicId(
      category.image,
      env.CLOUDINARY_CLOUD_NAME
    );
    return publicId ? [{ ...category, publicId }] : [];
  });
  let reconciled = 0;
  let concurrentlyChanged = 0;

  for (const category of owned) {
    if (!shouldApply) {
      logger.info(`[category-media] Would reconcile ${category.id}`, {
        publicId: category.publicId,
      });
      continue;
    }

    const result = await prisma.category.updateMany({
      where: {
        id: category.id,
        image: category.image,
        imagePublicId: null,
      },
      data: { imagePublicId: category.publicId },
    });
    if (result.count === 1) {
      reconciled += 1;
      logger.info(`[category-media] Reconciled ${category.id}`, {
        publicId: category.publicId,
      });
    } else {
      concurrentlyChanged += 1;
      logger.warn(
        `[category-media] Skipped concurrently changed category ${category.id}`,
        { sourceImage: category.image }
      );
    }
  }

  const summary: ReconciliationSummary = {
    mode: shouldApply ? 'apply' : 'dry-run',
    candidates: candidates.length,
    owned: owned.length,
    reconciled,
    concurrentlyChanged,
    skippedAsExternalOrAmbiguous: candidates.length - owned.length,
  };
  logger.info('[category-media] Reconciliation summary', summary);
  return summary;
}

if (require.main === module) {
  reconcileCategoryMedia()
    .catch((error) => {
      logger.error('[category-media] Reconciliation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

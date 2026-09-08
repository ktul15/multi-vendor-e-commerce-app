import { deleteImage } from './cloudinaryUpload';
import { logger } from './logger';

export async function cleanupMediaBestEffort(
  publicId: string,
  context: string
): Promise<void> {
  try {
    await deleteImage(publicId);
  } catch (error) {
    logger.warn(`[media-cleanup] Failed to delete ${publicId}`, {
      context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const CLOUDINARY_HOST = 'res.cloudinary.com';

/**
 * Infer ownership only from Cloudinary delivery URLs for this deployment's
 * configured cloud. Foreign-cloud and ambiguous URLs deliberately fail closed.
 */
export function inferManagedCategoryPublicId(
  image: string | null,
  configuredCloudName: string
): string | null {
  if (!image || !configuredCloudName) return null;

  try {
    const url = new URL(image);
    if (url.protocol !== 'https:' || url.hostname !== CLOUDINARY_HOST) {
      return null;
    }

    const match = url.pathname.match(
      /^\/([^/]+)\/image\/upload\/v\d+\/(categories\/.+)\.[a-z0-9]+$/i
    );
    if (!match?.[1] || !match[2]) return null;

    const cloudName = decodeURIComponent(match[1]);
    if (cloudName !== configuredCloudName) return null;

    const publicId = decodeURIComponent(match[2]);
    return publicId.startsWith('categories/') ? publicId : null;
  } catch {
    return null;
  }
}

import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/apiError';

export interface UploadResult {
    url: string;
    publicId: string;
}

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param buffer   - Raw file buffer from Multer memory storage (must be non-empty)
 * @param folder   - Cloudinary folder to organise uploads (e.g. 'products', 'categories')
 * @returns        - Secure URL and public_id of the uploaded image
 * @throws         - ApiError(400) if buffer is empty or folder is blank
 * @throws         - Error if the Cloudinary API rejects the upload
 */
export const uploadImage = (buffer: Buffer, folder: string): Promise<UploadResult> => {
    if (!buffer || buffer.length === 0) {
        return Promise.reject(ApiError.badRequest('Upload buffer is empty'));
    }
    if (!folder || folder.trim() === '') {
        return Promise.reject(ApiError.badRequest('Upload folder must be a non-empty string'));
    }

    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    folder,
                    resource_type: 'image',
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error || !result) {
                        if (error instanceof Error && error.message.includes('Invalid Signature')) {
                            reject(
                                ApiError.internal(
                                    'Cloudinary upload failed. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are from the same Cloudinary account.'
                                )
                            );
                            return;
                        }
                        reject(error ?? new Error('Cloudinary upload failed'));
                        return;
                    }
                    resolve({ url: result.secure_url, publicId: result.public_id });
                }
            )
            .end(buffer);
    });
};

/**
 * Delete an image from Cloudinary by its public_id.
 *
 * @param publicId - The public_id returned at upload time
 * @throws         - Error if Cloudinary reports deletion failed or image not found
 */
export const deleteImage = async (publicId: string): Promise<void> => {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result !== 'ok') {
        throw new Error(`Cloudinary deletion failed for "${publicId}": ${result.result}`);
    }
};

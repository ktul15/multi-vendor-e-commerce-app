import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '../utils/apiError';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const validateUploadedImageContents = (
  file: Express.Multer.File
): void => {
  const bytes = file.buffer;
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const matchesMime =
    (file.mimetype === 'image/jpeg' && isJpeg) ||
    (file.mimetype === 'image/png' && isPng) ||
    (file.mimetype === 'image/webp' && isWebp);

  if (!matchesMime) {
    throw ApiError.badRequest(
      'Image content does not match its declared JPEG, PNG, or WebP type'
    );
  }
};

function uploadedFiles(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files ?? {}).flat();
}

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  }
};

/**
 * Multer instance using in-memory storage.
 * Use via withUpload() wrapper to get proper error handling.
 *
 *   upload.single('image')   — single file on field 'image'
 *   upload.array('images', 5) — up to 5 files on field 'images'
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

/**
 * Wraps a Multer middleware and translates MulterError / fileFilter errors
 * into ApiError so the central errorHandler returns structured JSON responses.
 *
 *   LIMIT_FILE_SIZE        → 413  File too large
 *   LIMIT_UNEXPECTED_FILE  → 400  Unexpected field
 *   Other MulterError      → 400  Bad request
 *   fileFilter rejection   → 400  Invalid file type
 *
 * Usage:
 *   router.post('/upload', withUpload(upload.single('image')), controller)
 */
export const withUpload = (middleware: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (err: unknown) => {
      if (!err) {
        try {
          uploadedFiles(req).forEach(validateUploadedImageContents);
          next();
        } catch (validationError) {
          next(validationError);
        }
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ApiError(
              413,
              `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB`
            )
          );
        }
        return next(ApiError.badRequest(err.message));
      }

      // Plain Error thrown by fileFilter (invalid MIME type)
      if (err instanceof Error) {
        return next(ApiError.badRequest(err.message));
      }

      next(err);
    });
  };
};

export default upload;

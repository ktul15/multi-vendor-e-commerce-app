import { validateUploadedImageContents } from '../../middleware/upload';
import { ApiError } from '../../utils/apiError';

function uploadedFile(
  mimetype: string,
  bytes: readonly number[]
): Express.Multer.File {
  return {
    buffer: Buffer.from(bytes),
    destination: '',
    encoding: '7bit',
    fieldname: 'image',
    filename: '',
    mimetype,
    originalname: 'image',
    path: '',
    size: bytes.length,
    stream: undefined as never,
  };
}

describe('Upload content validation', () => {
  it.each([
    ['image/jpeg', [0xff, 0xd8, 0xff, 0x00]],
    ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    [
      'image/webp',
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
    ],
  ])('accepts a valid %s signature', (mimetype, bytes) => {
    expect(() =>
      validateUploadedImageContents(uploadedFile(mimetype, bytes))
    ).not.toThrow();
  });

  it('rejects executable content disguised with an allowed MIME type', () => {
    expect(() =>
      validateUploadedImageContents(
        uploadedFile('image/png', [...Buffer.from('<script>alert(1)</script>')])
      )
    ).toThrow(ApiError);
  });

  it('rejects a signature that does not match the declared image type', () => {
    expect(() =>
      validateUploadedImageContents(
        uploadedFile('image/jpeg', [0x89, 0x50, 0x4e, 0x47])
      )
    ).toThrow(
      'Image content does not match its declared JPEG, PNG, or WebP type'
    );
  });
});

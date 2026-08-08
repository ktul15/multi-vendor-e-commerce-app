import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { productMediaParamSchema } from '../../src/modules/product/product.validation';

const migrationPath = path.resolve(
  __dirname,
  '../../prisma/migrations/20260808050000_add_product_media/migration.sql'
);
const migration = readFileSync(migrationPath, 'utf8');

describe('product media migration contract', () => {
  it('backfills deterministic UUID-v4-shaped media IDs accepted by route validation', () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    const digest = createHash('md5').update(`${productId}:1`).digest('hex');
    const mediaId = [
      digest.slice(0, 8),
      digest.slice(8, 12),
      `4${digest.slice(13, 16)}`,
      `8${digest.slice(17, 20)}`,
      digest.slice(20, 32),
    ].join('-');

    expect(mediaId).toBe('8376cdca-71e7-4cc0-829e-a1ee40c25049');
    expect(mediaId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(
      productMediaParamSchema.safeParse({ id: productId, mediaId }).success
    ).toBe(true);
    expect(migration).toContain("'4' || substr(digest, 14, 3)");
    expect(migration).toContain("'8' || substr(digest, 18, 3)");
    expect(migration).toContain(
      'md5(product."id" || \':\' || image.ordinality::TEXT) AS digest'
    );
  });

  it('preserves array order and leaves unverifiable legacy ownership null', () => {
    expect(migration).toContain('WITH ORDINALITY AS image(url, ordinality)');
    expect(migration).toContain('image.ordinality - 1');

    const insertColumns = migration.match(
      /INSERT INTO "product_media" \(([^)]+)\)/s
    )?.[1];
    expect(insertColumns).toBeDefined();
    expect(insertColumns).not.toContain('"publicId"');
    expect(migration).toContain(
      'Their\n-- Cloudinary ownership is unknown, so publicId remains null'
    );
  });
});

-- Persist stable product-media identities and Cloudinary cleanup metadata while
-- retaining products.images as the backwards-compatible ordered URL projection.
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy URL arrays with deterministic UUID-shaped identifiers. Their
-- Cloudinary ownership is unknown, so publicId remains null and cleanup fails closed.
INSERT INTO "product_media" (
    "id",
    "productId",
    "url",
    "position",
    "createdAt",
    "updatedAt"
)
SELECT
    substr(digest, 1, 8) || '-' || substr(digest, 9, 4) || '-' ||
    '4' || substr(digest, 14, 3) || '-' || '8' || substr(digest, 18, 3) || '-' ||
    substr(digest, 21, 12),
    product."id",
    image.url,
    image.ordinality - 1,
    product."createdAt",
    product."updatedAt"
FROM "products" AS product
CROSS JOIN LATERAL unnest(product."images") WITH ORDINALITY AS image(url, ordinality)
CROSS JOIN LATERAL (SELECT md5(product."id" || ':' || image.ordinality::TEXT) AS digest) AS hash;

CREATE UNIQUE INDEX "product_media_productId_position_key"
    ON "product_media"("productId", "position");
CREATE INDEX "product_media_productId_idx" ON "product_media"("productId");

ALTER TABLE "product_media"
    ADD CONSTRAINT "product_media_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

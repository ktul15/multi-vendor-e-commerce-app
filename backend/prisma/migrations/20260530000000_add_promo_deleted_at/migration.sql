-- Add a separate soft-delete marker so inactive promo codes can remain visible
-- in admin filters while deleted promo codes are hidden from list/search results.
ALTER TABLE "promo_codes" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "promo_codes_deletedAt_idx" ON "promo_codes"("deletedAt");

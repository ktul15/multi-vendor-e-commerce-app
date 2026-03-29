-- AlterTable
ALTER TABLE "products" ALTER COLUMN "avgRating" SET DATA TYPE DECIMAL(4,2);

-- CreateIndex
CREATE INDEX "reviews_productId_rating_idx" ON "reviews"("productId", "rating");

-- AddCheckConstraint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);

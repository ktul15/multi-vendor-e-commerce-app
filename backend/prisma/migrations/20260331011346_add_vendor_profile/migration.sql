-- CreateEnum
CREATE TYPE "VendorProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN     "perUserLimit" INTEGER;

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeLogo" TEXT,
    "storeBanner" TEXT,
    "description" TEXT,
    "status" "VendorProfileStatus" NOT NULL DEFAULT 'PENDING',
    "stripeAccountId" TEXT,
    "bankDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_userId_key" ON "vendor_profiles"("userId");

-- CreateIndex
CREATE INDEX "vendor_profiles_status_idx" ON "vendor_profiles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_orderId_key" ON "promo_usages"("orderId");

-- CreateIndex
CREATE INDEX "promo_usages_userId_promoCodeId_idx" ON "promo_usages"("userId", "promoCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_userId_orderId_key" ON "promo_usages"("userId", "orderId");

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

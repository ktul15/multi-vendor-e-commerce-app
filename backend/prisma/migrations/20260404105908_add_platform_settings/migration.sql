-- CreateEnum
CREATE TYPE "VendorOnboardingStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'COMPLETE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'TRANSFERRED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'VENDOR_ONBOARDING_COMPLETE';
ALTER TYPE "NotificationType" ADD VALUE 'VENDOR_PAYOUT_PAID';
ALTER TYPE "NotificationType" ADD VALUE 'VENDOR_PAYOUT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'VENDOR_EARNING_CREATED';

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "commissionRate" DECIMAL(5,2),
ADD COLUMN     "stripeOnboardingStatus" "VendorOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "vendor_earnings" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "vendorOrderId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "transferredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payouts" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "stripePayoutId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "arrivalDate" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_earnings_vendorOrderId_key" ON "vendor_earnings"("vendorOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_earnings_stripeTransferId_key" ON "vendor_earnings"("stripeTransferId");

-- CreateIndex
CREATE INDEX "vendor_earnings_vendorProfileId_idx" ON "vendor_earnings"("vendorProfileId");

-- CreateIndex
CREATE INDEX "vendor_earnings_status_idx" ON "vendor_earnings"("status");

-- CreateIndex
CREATE INDEX "vendor_earnings_createdAt_idx" ON "vendor_earnings"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payouts_stripePayoutId_key" ON "vendor_payouts"("stripePayoutId");

-- CreateIndex
CREATE INDEX "vendor_payouts_vendorProfileId_idx" ON "vendor_payouts"("vendorProfileId");

-- CreateIndex
CREATE INDEX "vendor_payouts_status_idx" ON "vendor_payouts"("status");

-- AddForeignKey
ALTER TABLE "vendor_earnings" ADD CONSTRAINT "vendor_earnings_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_earnings" ADD CONSTRAINT "vendor_earnings_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "vendor_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_earnings" ADD CONSTRAINT "vendor_earnings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

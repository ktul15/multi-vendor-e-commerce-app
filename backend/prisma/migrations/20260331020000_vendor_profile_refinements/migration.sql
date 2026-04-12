-- AlterEnum
ALTER TYPE "VendorProfileStatus" ADD VALUE 'REJECTED';

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_stripeAccountId_key" ON "vendor_profiles"("stripeAccountId");

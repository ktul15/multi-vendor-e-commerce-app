-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD');

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropIndex
DROP INDEX "orders_status_idx";

-- DropIndex
DROP INDEX "promo_codes_code_idx";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "orderId",
ADD COLUMN     "vendorOrderId" TEXT NOT NULL,
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "shippingAddress" JSONB NOT NULL,
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "basePrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "avgRating" SET DATA TYPE DECIMAL(3,2);

-- AlterTable
ALTER TABLE "promo_codes" ALTER COLUMN "discountValue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "minOrderValue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "maxDiscount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "variants" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "vendor_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_orders_vendorId_idx" ON "vendor_orders"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_orders_status_idx" ON "vendor_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_orders_orderId_vendorId_key" ON "vendor_orders"("orderId", "vendorId");

-- CreateIndex
CREATE INDEX "order_items_vendorOrderId_idx" ON "order_items"("vendorOrderId");

-- CreateIndex
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- CreateIndex
CREATE INDEX "orders_promoCodeId_idx" ON "orders"("promoCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_fcmToken_key" ON "users"("fcmToken");

-- CreateIndex
CREATE INDEX "variants_productId_idx" ON "variants"("productId");

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "vendor_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

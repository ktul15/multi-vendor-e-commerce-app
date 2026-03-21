-- AlterTable: add orderNumber to orders
ALTER TABLE "orders" ADD COLUMN "orderNumber" TEXT NOT NULL DEFAULT '';

-- Backfill: ensure existing rows get a unique value (no-op in fresh dev DB)
-- Update constraint to remove DEFAULT after backfill
ALTER TABLE "orders" ALTER COLUMN "orderNumber" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- Provider-neutral payment identifiers preserve existing Stripe history while
-- allowing sandbox Razorpay Route orders to coexist in the same domain model.
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'RAZORPAY');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "RefundReversalStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "vendor_profiles"
  RENAME COLUMN "stripeAccountId" TO "providerAccountId";
ALTER TABLE "vendor_profiles"
  RENAME COLUMN "stripeOnboardingStatus" TO "paymentOnboardingStatus";
ALTER TABLE "vendor_profiles"
  ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN "settlementCountry" TEXT NOT NULL DEFAULT 'IN';
UPDATE "vendor_profiles"
SET "paymentProvider" = 'STRIPE'
WHERE "providerAccountId" IS NOT NULL;
ALTER INDEX "vendor_profiles_stripeAccountId_key"
  RENAME TO "vendor_profiles_providerAccountId_key";

ALTER TABLE "orders"
  ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "orders"
  ALTER COLUMN "paymentProvider" DROP DEFAULT;

ALTER TABLE "payments"
  RENAME COLUMN "stripePaymentIntentId" TO "providerPaymentId";
ALTER TABLE "payments"
  RENAME COLUMN "stripePaymentMethodId" TO "providerPaymentMethodId";
ALTER TABLE "payments"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN "providerOrderId" TEXT,
  ADD COLUMN "checkoutLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "checkoutLeaseToken" TEXT,
  ADD COLUMN "reversalLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "reversalLeaseToken" TEXT;
ALTER TABLE "payments"
  ALTER COLUMN "provider" DROP DEFAULT;
ALTER INDEX "payments_stripePaymentIntentId_key"
  RENAME TO "payments_providerPaymentId_key";
CREATE UNIQUE INDEX "payments_providerOrderId_key"
  ON "payments"("providerOrderId");

ALTER TABLE "vendor_earnings"
  RENAME COLUMN "stripeTransferId" TO "providerTransferId";
ALTER TABLE "vendor_earnings"
  ADD COLUMN "reversedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER INDEX "vendor_earnings_stripeTransferId_key"
  RENAME TO "vendor_earnings_providerTransferId_key";

ALTER TABLE "vendor_payouts"
  RENAME COLUMN "stripePayoutId" TO "providerPayoutId";
ALTER TABLE "vendor_payouts"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "vendor_payouts"
  ALTER COLUMN "provider" DROP DEFAULT;
ALTER INDEX "vendor_payouts_stripePayoutId_key"
  RENAME TO "vendor_payouts_providerPayoutId_key";

CREATE TABLE "payment_refunds" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerRefundId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "providerLeaseExpiresAt" TIMESTAMP(3),
  "providerLeaseToken" TEXT,
  "reversalStatus" "RefundReversalStatus" NOT NULL DEFAULT 'PENDING',
  "reversalLeaseExpiresAt" TIMESTAMP(3),
  "reversalAttempts" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "failureReason" TEXT,
  "reversalFailureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_refunds_providerRefundId_key"
  ON "payment_refunds"("providerRefundId");
CREATE INDEX "payment_refunds_paymentId_status_idx"
  ON "payment_refunds"("paymentId", "status");
ALTER TABLE "payment_refunds"
  ADD CONSTRAINT "payment_refunds_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_webhook_events_provider_eventId_key"
  ON "payment_webhook_events"("provider", "eventId");
CREATE INDEX "payment_webhook_events_processedAt_idx"
  ON "payment_webhook_events"("processedAt");

-- The platform is INR-only. Existing monetary amounts are intentionally not
-- converted; this migration changes their currency classification and all
-- defaults. Reprice catalog/test data separately where required.
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "vendor_earnings" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "vendor_payouts" ALTER COLUMN "currency" SET DEFAULT 'INR';

UPDATE "payments" SET "currency" = 'INR' WHERE "currency" <> 'INR';
UPDATE "vendor_earnings" SET "currency" = 'INR' WHERE "currency" <> 'INR';
UPDATE "vendor_payouts" SET "currency" = 'INR' WHERE "currency" <> 'INR';

-- Fail safely if legacy data contains names that normalize to the same value.
-- Operators must reconcile those records explicitly before retrying migration.
DO $$
BEGIN
    IF EXISTS (
        SELECT LOWER(BTRIM("storeName"))
        FROM "vendor_profiles"
        GROUP BY LOWER(BTRIM("storeName"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce normalized store-name uniqueness: duplicate store names exist';
    END IF;
END $$;

-- Preserve the display value while enforcing uniqueness after trim/case normalization.
CREATE UNIQUE INDEX "vendor_profiles_store_name_normalized_key"
ON "vendor_profiles" (LOWER(BTRIM("storeName")));

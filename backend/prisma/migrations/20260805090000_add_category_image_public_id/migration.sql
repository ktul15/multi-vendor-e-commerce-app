-- Refuse to make the complete-tree contract live while legacy cyclic data exists.
-- The exception includes the affected origin IDs so an operator can repair their
-- parentId values and re-run the migration without losing data.
DO $$
DECLARE
  cycle_origins TEXT;
BEGIN
  WITH RECURSIVE ancestry AS (
    SELECT
      "id" AS origin_id,
      "id",
      "parentId",
      ARRAY["id"]::TEXT[] AS path,
      FALSE AS has_cycle
    FROM "categories"

    UNION ALL

    SELECT
      ancestry.origin_id,
      parent."id",
      parent."parentId",
      ancestry.path || parent."id",
      parent."id" = ANY(ancestry.path)
    FROM ancestry
    JOIN "categories" AS parent ON parent."id" = ancestry."parentId"
    WHERE NOT ancestry.has_cycle
  )
  SELECT string_agg(DISTINCT origin_id, ', ')
  INTO cycle_origins
  FROM ancestry
  WHERE has_cycle;

  IF cycle_origins IS NOT NULL THEN
    RAISE EXCEPTION
      'Category hierarchy contains cycles for category IDs: %. Repair parentId values before retrying migration 20260805090000.',
      cycle_origins;
  END IF;
END $$;

ALTER TABLE "categories" ADD COLUMN "imagePublicId" TEXT;

-- Ownership cannot be inferred safely in static SQL because the configured
-- Cloudinary cloud name is deployment-specific. Run the environment-aware
-- category-media reconciliation script after deployment; all rows fail closed
-- with imagePublicId NULL until their cloud name is verified.

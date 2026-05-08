-- Provider card enrichment + reviews.
--
-- Two strands here, kept in one migration because the rating fields on the
-- card only make sense once reviews exist:
--   1. Provider profile: free-form base_city for the card chip + the year
--      the provider started doing this professionally.
--   2. reviews table: extend the empty stub from migration 0000 so it can
--      power per-provider listings + aggregate rating queries directly,
--      without needing to JOIN through bookings every time.

ALTER TABLE "service_provider_profiles"
  ADD COLUMN IF NOT EXISTS "base_city" text,
  ADD COLUMN IF NOT EXISTS "experience_since_year" smallint;

-- Sanity-check the year so a typo (2K, 999, etc.) is rejected at write time.
-- The upper bound is generous on purpose — we don't want this CHECK to
-- expire on Jan 1; the API layer rejects future years anyway.
ALTER TABLE "service_provider_profiles"
  DROP CONSTRAINT IF EXISTS "experience_since_year_range";
ALTER TABLE "service_provider_profiles"
  ADD CONSTRAINT "experience_since_year_range"
  CHECK ("experience_since_year" IS NULL
         OR ("experience_since_year" BETWEEN 1900 AND 2100));

--> statement-breakpoint

-- Reviews: add owner_id + provider_id (denormalised from bookings) so the
-- listing query on a provider page is a single index lookup, and so the
-- aggregate AVG/COUNT in /providers search doesn't need a join through
-- bookings. Rename `comment` → `body` to match the shared type and the
-- field label users see in the UI.

ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "owner_id" uuid
    REFERENCES "users"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "provider_id" uuid
    REFERENCES "service_provider_profiles"("user_id") ON DELETE CASCADE;
--> statement-breakpoint

-- Backfill — copy from the booking that owns each review, then enforce
-- NOT NULL. Idempotent: only fills rows that are still null.
UPDATE "reviews" r
   SET "owner_id" = b."owner_id",
       "provider_id" = b."provider_id"
  FROM "bookings" b
 WHERE b."id" = r."booking_id"
   AND (r."owner_id" IS NULL OR r."provider_id" IS NULL);
--> statement-breakpoint

ALTER TABLE "reviews"
  ALTER COLUMN "owner_id" SET NOT NULL,
  ALTER COLUMN "provider_id" SET NOT NULL;
--> statement-breakpoint

-- Rename comment → body. Guarded so the migration is re-runnable in dev.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reviews' AND column_name = 'comment'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reviews' AND column_name = 'body'
  ) THEN
    EXECUTE 'ALTER TABLE "reviews" RENAME COLUMN "comment" TO "body"';
  END IF;
END$$;
--> statement-breakpoint

-- Index for the per-provider listing query, ordered by recency. Same
-- index also serves the AVG/COUNT aggregate in /providers search since
-- provider_id is the leftmost key.
CREATE INDEX IF NOT EXISTS "reviews_provider_recent_idx"
  ON "reviews" ("provider_id", "created_at" DESC);

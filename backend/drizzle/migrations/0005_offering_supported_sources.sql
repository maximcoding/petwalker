-- Provider opts in to which location types they support per offering.
-- Replaces the single `address_default` field with three independent flags.
-- The original column is kept for now (deprecated, no longer read) so we
-- don't lose the previously-saved hint in case we want to migrate it later.

ALTER TABLE "provider_service_offerings"
  ADD COLUMN IF NOT EXISTS "supports_owner_location"    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "supports_provider_location" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_custom_location"   boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Backfill from existing address_default values:
--   'owner'    → supports_owner=true  only
--   'provider' → supports_provider=true  only
--   'either'   → supports_owner=true + supports_provider=true
-- The column defaults already cover 'owner'; we only need to fix the
-- other two cases. Run the UPDATE unconditionally — it's idempotent
-- because the WHERE clause matches one row per case.
UPDATE "provider_service_offerings"
   SET "supports_owner_location"    = false,
       "supports_provider_location" = true,
       "supports_custom_location"   = false
 WHERE "address_default" = 'provider';
--> statement-breakpoint
UPDATE "provider_service_offerings"
   SET "supports_owner_location"    = true,
       "supports_provider_location" = true,
       "supports_custom_location"   = false
 WHERE "address_default" = 'either';
--> statement-breakpoint

-- Guard against a row where the provider opted out of every option —
-- that's nonsensical (nothing is bookable). Enforced at the DB level so
-- buggy upserts can't sneak past the zod validator.
ALTER TABLE "provider_service_offerings"
  ADD CONSTRAINT "supports_at_least_one_location"
  CHECK ("supports_owner_location" OR "supports_provider_location" OR "supports_custom_location");

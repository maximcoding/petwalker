-- Provider opts in to which location families they support per offering.
-- Adds three independent flags; the existing `address_default` column is
-- left as deprecated metadata and is no longer read by the app.

ALTER TABLE "provider_service_offerings"
  ADD COLUMN IF NOT EXISTS "supports_owner_location"    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "supports_provider_location" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supports_custom_location"   boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Backfill from existing address_default values:
--   'owner'    → supports_owner=true only (matches the column defaults)
--   'provider' → supports_provider=true only
--   'either'   → supports_owner + supports_provider both true
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

-- Guard against a row with every flag false — that's nonsensical (nothing
-- is bookable). Enforced at the DB level so a buggy upsert can't sneak
-- past the zod validator.
ALTER TABLE "provider_service_offerings"
  ADD CONSTRAINT "supports_at_least_one_location"
  CHECK ("supports_owner_location" OR "supports_provider_location" OR "supports_custom_location");

-- Idempotent address-column add. Pairs with the in-place edits to 0000
-- and 0003: on a freshly wiped DB those edits create the columns, and
-- this migration is a no-op. On an existing DB (whose 0000 already ran
-- before the edits), CREATE TABLE IF NOT EXISTS kept the old shape, so
-- this file is what actually adds the new columns.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "address_text" text,
  ADD COLUMN IF NOT EXISTS "address_lat" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "address_lng" numeric(9, 6);
--> statement-breakpoint
ALTER TABLE "pets"
  ADD COLUMN IF NOT EXISTS "address_text" text,
  ADD COLUMN IF NOT EXISTS "address_lat" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "address_lng" numeric(9, 6);
--> statement-breakpoint
ALTER TABLE "provider_service_offerings"
  ADD COLUMN IF NOT EXISTS "service_address_text" text,
  ADD COLUMN IF NOT EXISTS "service_address_lat" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "service_address_lng" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "address_default" text NOT NULL DEFAULT 'owner';
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "address_text" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "address_lat" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "address_lng" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "address_source" text NOT NULL DEFAULT 'owner_pet';

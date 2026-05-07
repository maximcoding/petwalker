ALTER TABLE "provider_service_offerings"
  ADD COLUMN IF NOT EXISTS "booking_mode" text NOT NULL DEFAULT 'window',
  ADD COLUMN IF NOT EXISTS "slot_duration_min" integer NOT NULL DEFAULT 60;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provider_slots" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider_id"  uuid NOT NULL REFERENCES "service_provider_profiles"("user_id") ON DELETE CASCADE,
  "service_type" service_type NOT NULL,
  "start_ts"     timestamp with time zone NOT NULL,
  "end_ts"       timestamp with time zone NOT NULL,
  "status"       text NOT NULL DEFAULT 'open',
  "booking_id"   uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_slots_unique"
  ON "provider_slots" ("provider_id", "service_type", "start_ts");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_slots_query_idx"
  ON "provider_slots" ("provider_id", "service_type", "start_ts", "status");

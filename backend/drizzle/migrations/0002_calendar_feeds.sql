CREATE TABLE IF NOT EXISTS "provider_calendar_feeds" (
  "user_id"          uuid PRIMARY KEY NOT NULL REFERENCES "service_provider_profiles"("user_id") ON DELETE CASCADE,
  "ical_url"         text NOT NULL,
  "enabled"          boolean NOT NULL DEFAULT true,
  "last_synced_at"   timestamp with time zone,
  "last_sync_error"  text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_busy_blocks" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider_id"  uuid NOT NULL REFERENCES "service_provider_profiles"("user_id") ON DELETE CASCADE,
  "source"       text NOT NULL DEFAULT 'ical',
  "external_id"  text NOT NULL,
  "start_ts"     timestamp with time zone NOT NULL,
  "end_ts"       timestamp with time zone NOT NULL,
  "summary"      text,
  "synced_at"    timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_busy_blocks_unique"
  ON "external_busy_blocks" ("provider_id", "source", "external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_busy_blocks_overlap_idx"
  ON "external_busy_blocks" ("provider_id", "start_ts", "end_ts");

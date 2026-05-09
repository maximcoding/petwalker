CREATE TABLE IF NOT EXISTS "provider_blackouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_id" uuid NOT NULL REFERENCES "service_provider_profiles"("user_id") ON DELETE CASCADE,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

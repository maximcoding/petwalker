-- Owner-side favorites — providers an owner has saved for quick access.
-- Composite PK gives idempotent toggle (insert ON CONFLICT DO NOTHING /
-- delete by PK), and natural uniqueness without a separate constraint.
-- Cascade on delete so removing a user or provider doesn't leave
-- dangling rows.

CREATE TABLE IF NOT EXISTS "user_favorites" (
  "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider_id" uuid NOT NULL REFERENCES "service_provider_profiles"("user_id") ON DELETE CASCADE,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "provider_id")
);
--> statement-breakpoint
-- The PK already covers `(user_id, provider_id)` lookups; this index
-- supports the GET /me/favorites listing query, which orders by recency.
CREATE INDEX IF NOT EXISTS "user_favorites_user_recent_idx"
  ON "user_favorites" ("user_id", "created_at" DESC);

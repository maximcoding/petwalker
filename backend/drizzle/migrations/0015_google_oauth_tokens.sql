-- Calendar v2 — replace iCal feed with Google OAuth.
--
-- Stores per-user OAuth tokens granted via the "Connect Google Calendar"
-- consent flow. One row per user (PK = user_id). The CalendarSyncService
-- reads `access_token` (refreshing via `refresh_token` when expired) and
-- queries Google's freebusy.query API to fetch busy windows that block
-- booking slots — same downstream effect as the old iCal path, without
-- the user needing to know what an iCal URL is.
--
-- The legacy `provider_calendar_feeds` table sticks around for one
-- release so existing dev DBs don't break; migration 0016 drops it once
-- the new flow is verified end-to-end.

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  google_email   text NOT NULL,
  access_token   text NOT NULL,
  refresh_token  text NOT NULL,
  expires_at     timestamptz NOT NULL,
  scope          text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- The freebusy sweep needs to find every Google-connected user; PK on
-- user_id is enough for per-user reads, but a brute-force "find all
-- connected accounts" scan stays cheap with a btree on expires_at so
-- the sweeper can prioritise rows whose access_token is about to die.
CREATE INDEX IF NOT EXISTS google_oauth_tokens_expires_at_idx
  ON google_oauth_tokens (expires_at);

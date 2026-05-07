-- Runs once on fresh postgres volume.
-- ONLY for things Drizzle migrations cannot do — postgres extensions.
-- Schema and seed are owned by @petwalker/db (Drizzle migrations + seed.ts).

\connect petwalker;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive emails

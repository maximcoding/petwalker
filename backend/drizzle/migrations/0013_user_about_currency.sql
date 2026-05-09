-- Phase 2 of the IA refactor — add `aboutMe` and `preferredCurrency` to
-- the users table.
--
-- `about_me` is a free-form bio. Capped to 600 chars at the API layer
-- (UpdateUserDto) so we keep the column as `text` and don't enforce the
-- length in SQL — that way a future DTO bump doesn't need a migration.
--
-- `preferred_currency` is an ISO-4217 code restricted to the values in
-- shared/src/types/user.ts SUPPORTED_CURRENCIES. The CHECK keeps the
-- column in sync; expand it in the same commit that expands the TS list.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS about_me text,
  ADD COLUMN IF NOT EXISTS preferred_currency text;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_preferred_currency_chk;

ALTER TABLE users
  ADD CONSTRAINT users_preferred_currency_chk
  CHECK (preferred_currency IS NULL OR preferred_currency IN ('USD', 'EUR', 'ILS'));

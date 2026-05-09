-- Phase 3 — saved cards.
--
-- Adds `stripe_customer_id` to users. Nullable on purpose: we mint the
-- Stripe Customer lazily the first time the user touches a money flow
-- that needs it (saving a card, paying with a saved card). Indexed so
-- the webhook handler can route incoming customer.* events back to a
-- user row in O(log n).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_idx
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

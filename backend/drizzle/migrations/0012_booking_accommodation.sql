-- Add with_accommodation flag to bookings.
-- Existing rows default to false (no accommodation).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS with_accommodation boolean NOT NULL DEFAULT false;

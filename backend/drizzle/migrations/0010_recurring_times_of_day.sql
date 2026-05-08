-- Convert existing single-time strings to JSON arrays.
-- Rows already in JSON array format are left alone.
UPDATE recurring_series
SET time_of_day = '["' || time_of_day || '"]'
WHERE time_of_day NOT LIKE '[%';

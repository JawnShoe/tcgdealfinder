BEGIN;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS deal_confidence_weight NUMERIC(5, 3);

COMMIT;

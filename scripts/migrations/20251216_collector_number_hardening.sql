BEGIN;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS collector_number_raw TEXT,
  ADD COLUMN IF NOT EXISTS collector_number_norm TEXT,
  ADD COLUMN IF NOT EXISTS collector_number_confidence TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS collector_number_signals TEXT[];

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS collector_number_raw TEXT,
  ADD COLUMN IF NOT EXISTS collector_number_norm TEXT,
  ADD COLUMN IF NOT EXISTS collector_number_confidence TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS collector_number_signals TEXT[],
  ADD COLUMN IF NOT EXISTS reject_detail TEXT;

ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_collector_number_confidence_check,
  ADD CONSTRAINT cards_collector_number_confidence_check
    CHECK (collector_number_confidence IN ('NONE', 'LOW', 'MED', 'HIGH'));

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_collector_number_confidence_check,
  ADD CONSTRAINT listings_collector_number_confidence_check
    CHECK (collector_number_confidence IN ('NONE', 'LOW', 'MED', 'HIGH'));

UPDATE cards
SET
  collector_number_raw = COALESCE(collector_number_raw, card_number),
  collector_number_norm = COALESCE(
    collector_number_norm,
    REGEXP_REPLACE(UPPER(COALESCE(card_number, '')), '[^A-Z0-9/]', '', 'g')
  ),
  collector_number_confidence = CASE
    WHEN COALESCE(
      collector_number_norm,
      REGEXP_REPLACE(UPPER(COALESCE(card_number, '')), '[^A-Z0-9/]', '', 'g')
    ) = '' THEN 'NONE'
    ELSE 'HIGH'
  END
WHERE collector_number_confidence = 'NONE';

UPDATE listings
SET collector_number_confidence = 'NONE'
WHERE collector_number_confidence IS NULL;

COMMIT;

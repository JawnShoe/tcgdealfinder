BEGIN;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'UNKNOWN'
  CHECK (language IN ('EN', 'JP', 'UNKNOWN'));

CREATE INDEX IF NOT EXISTS cards_language_idx ON cards (language);

COMMIT;

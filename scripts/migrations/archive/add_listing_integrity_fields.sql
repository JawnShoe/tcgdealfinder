-- Adds integrity metadata columns to listings for post-ingestion gating.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS integrity_status TEXT NOT NULL DEFAULT 'OK',
  ADD COLUMN IF NOT EXISTS integrity_reason TEXT,
  ADD COLUMN IF NOT EXISTS integrity_score INT;

CREATE INDEX IF NOT EXISTS listings_integrity_status_idx
  ON listings(integrity_status);

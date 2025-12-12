ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS match_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS match_reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS reject_source TEXT,
  ADD COLUMN IF NOT EXISTS detected_collector_number TEXT,
  ADD COLUMN IF NOT EXISTS detected_language TEXT NOT NULL DEFAULT 'unknown';

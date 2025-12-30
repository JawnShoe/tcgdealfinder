-- Migration: Add DB-backed watchlist entries (Tier 2)
-- Purpose: Replace localStorage watchlist with DB-backed rows keyed by anon owner_id.

CREATE TABLE IF NOT EXISTS watchlist_entries (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, card_id)
);

-- Efficient lookups for per-user watchlist reads (and deterministic ordering by recency if needed)
CREATE INDEX IF NOT EXISTS watchlist_entries_owner_created_idx
  ON watchlist_entries (owner_id, created_at DESC);

-- Optional: fast reverse lookups / analysis
CREATE INDEX IF NOT EXISTS watchlist_entries_card_id_idx
  ON watchlist_entries (card_id);


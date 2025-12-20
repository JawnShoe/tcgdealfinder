ALTER TABLE catalog_sets
  ADD COLUMN IF NOT EXISTS pokemontcg_series TEXT,
  ADD COLUMN IF NOT EXISTS pokemontcg_total_cards INTEGER,
  ADD COLUMN IF NOT EXISTS symbol_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

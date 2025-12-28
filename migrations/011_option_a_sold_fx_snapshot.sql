-- Migration: Option A Phase 2 - Sold listings FX snapshot + USD totals
-- Run with: psql -d tcg_deals -f migrations/011_option_a_sold_fx_snapshot.sql

-- Extends ebay_sold_listings to store currency, deterministic totals, and a captured FX snapshot.
-- This enables baseline_median_usd computation from sold comps (total_usd).

-- 0) Ensure legacy market column exists (older DBs may be US-only)
ALTER TABLE ebay_sold_listings
  ADD COLUMN IF NOT EXISTS market TEXT;

UPDATE ebay_sold_listings
SET market = COALESCE(market, 'EBAY_US')
WHERE market IS NULL;

ALTER TABLE ebay_sold_listings
  ALTER COLUMN market SET NOT NULL,
  ALTER COLUMN market SET DEFAULT 'EBAY_US';

-- 1) Add columns (nullable first)
ALTER TABLE ebay_sold_listings
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS price_native NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS shipping_native NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS shipping_unknown BOOLEAN,
  ADD COLUMN IF NOT EXISTS total_native NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS fx_status TEXT,
  ADD COLUMN IF NOT EXISTS fx_rate_to_usd NUMERIC(18, 10),
  ADD COLUMN IF NOT EXISTS fx_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_usd NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ;

-- 2) Backfill timestamps (legacy rows)
UPDATE ebay_sold_listings
SET
  snapshot_at = COALESCE(snapshot_at, created_at, NOW()),
  ingested_at = COALESCE(ingested_at, created_at, NOW())
WHERE snapshot_at IS NULL OR ingested_at IS NULL;

-- 3) Backfill currency from market (best-effort)
UPDATE ebay_sold_listings
SET currency = CASE
  WHEN UPPER(market) IN ('EBAY_US', 'US', 'USA') THEN 'USD'
  WHEN UPPER(market) IN ('EBAY_CA', 'CA', 'CAN', 'CANADA') THEN 'CAD'
  WHEN UPPER(market) IN ('EBAY_GB', 'GB', 'UK', 'EBAY_UK') THEN 'GBP'
  WHEN UPPER(market) IN ('EBAY_AU', 'AU', 'AUS', 'AUSTRALIA') THEN 'AUD'
  ELSE 'USD'
END
WHERE currency IS NULL;

-- 4) Backfill native totals deterministically (shipping_unknown policy)
UPDATE ebay_sold_listings
SET price_native = COALESCE(price_native, price)
WHERE price_native IS NULL;

UPDATE ebay_sold_listings
SET shipping_unknown = (shipping_native IS NULL)
WHERE shipping_unknown IS NULL;

UPDATE ebay_sold_listings
SET total_native = price_native + COALESCE(shipping_native, 0)
WHERE total_native IS NULL AND price_native IS NOT NULL;

-- 5) Best-effort FX snapshot backfill (currency -> fx_rates snapshot)
UPDATE ebay_sold_listings s
SET fx_rate_to_usd = r.rate_to_usd
FROM fx_rates r
WHERE
  s.fx_rate_to_usd IS NULL
  AND UPPER(s.currency) = UPPER(r.currency);

-- USD fallback (should already be present via fx_rates)
UPDATE ebay_sold_listings
SET fx_rate_to_usd = 1.0
WHERE fx_rate_to_usd IS NULL AND UPPER(currency) = 'USD';

UPDATE ebay_sold_listings s
SET fx_timestamp = r.updated_at
FROM fx_rates r
WHERE
  s.fx_timestamp IS NULL
  AND s.fx_rate_to_usd IS NOT NULL
  AND UPPER(s.currency) = UPPER(r.currency);

-- Compute total_usd where we have both total_native + fx_rate_to_usd
UPDATE ebay_sold_listings
SET total_usd = (total_native * fx_rate_to_usd)
WHERE
  total_usd IS NULL
  AND total_native IS NOT NULL
  AND fx_rate_to_usd IS NOT NULL;

-- 6) Backfill fx_status
UPDATE ebay_sold_listings
SET fx_status = CASE WHEN total_usd IS NULL THEN 'MISSING' ELSE 'OK' END
WHERE fx_status IS DISTINCT FROM CASE WHEN total_usd IS NULL THEN 'MISSING' ELSE 'OK' END;

-- 7) Set defaults / constraints
ALTER TABLE ebay_sold_listings
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN currency SET DEFAULT 'USD',
  ALTER COLUMN price_native SET NOT NULL,
  ALTER COLUMN shipping_unknown SET NOT NULL,
  ALTER COLUMN shipping_unknown SET DEFAULT TRUE,
  ALTER COLUMN total_native SET NOT NULL,
  ALTER COLUMN fx_status SET NOT NULL,
  ALTER COLUMN fx_status SET DEFAULT 'OK',
  ALTER COLUMN snapshot_at SET NOT NULL,
  ALTER COLUMN snapshot_at SET DEFAULT NOW(),
  ALTER COLUMN ingested_at SET NOT NULL,
  ALTER COLUMN ingested_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ebay_sold_listings_fx_status_check'
  ) THEN
    ALTER TABLE ebay_sold_listings
      ADD CONSTRAINT ebay_sold_listings_fx_status_check
      CHECK (fx_status IN ('OK', 'MISSING'));
  END IF;
END
$$;

-- Optional indexes for baseline computation
CREATE INDEX IF NOT EXISTS ebay_sold_listings_card_market_sold_at_desc_idx
  ON ebay_sold_listings (card_id, market, sold_at DESC);

CREATE INDEX IF NOT EXISTS ebay_sold_listings_fx_status_idx
  ON ebay_sold_listings (fx_status);

COMMENT ON COLUMN ebay_sold_listings.snapshot_at IS 'Observed time for the sold listing snapshot (Option A Phase 2)';
COMMENT ON COLUMN ebay_sold_listings.ingested_at IS 'DB write time for the sold listing snapshot (Option A Phase 2)';
COMMENT ON COLUMN ebay_sold_listings.shipping_unknown IS 'True when shipping_native is NULL for that sold snapshot (Option A Phase 2)';
COMMENT ON COLUMN ebay_sold_listings.fx_status IS 'FX availability status for that sold snapshot (OK or MISSING) (Option A Phase 2)';
COMMENT ON COLUMN ebay_sold_listings.fx_timestamp IS 'Timestamp of the fx_rates snapshot used to compute total_usd (Option A Phase 2)';

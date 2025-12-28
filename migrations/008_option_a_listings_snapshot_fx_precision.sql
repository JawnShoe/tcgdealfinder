-- Migration: Option A Phase 1 - Listings snapshot timestamps + shipping_unknown + FX snapshot + precision widening
-- Run with: psql -d tcg_deals -f migrations/008_option_a_listings_snapshot_fx_precision.sql

-- Adds listing snapshot timestamps (snapshot_at + ingested_at),
-- shipping_unknown + fx_status flags, per-listing fx_timestamp, and widens precision for USD storage.

-- 1) Add columns (nullable first)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_unknown BOOLEAN,
  ADD COLUMN IF NOT EXISTS fx_status TEXT,
  ADD COLUMN IF NOT EXISTS fx_timestamp TIMESTAMPTZ;

-- 2) Widen precision (store precise; round for display)
ALTER TABLE listings
  ALTER COLUMN total_usd TYPE NUMERIC(18, 6),
  ALTER COLUMN fx_rate_to_usd TYPE NUMERIC(18, 10);

-- 3) Backfill timestamps (legacy rows)
UPDATE listings
SET
  snapshot_at = COALESCE(snapshot_at, updated_at),
  ingested_at = COALESCE(ingested_at, updated_at)
WHERE snapshot_at IS NULL OR ingested_at IS NULL;

-- 4) Backfill native fields for legacy rows (best-effort)
UPDATE listings
SET
  price_native = COALESCE(price_native, price_cad),
  shipping_native = CASE
    WHEN shipping_native IS NULL AND shipping_known = TRUE THEN shipping_cad
    ELSE shipping_native
  END
WHERE
  price_native IS NULL
  OR (
    shipping_native IS NULL
    AND shipping_known = TRUE
    AND shipping_cad IS NOT NULL
  );

-- 5) Backfill shipping_unknown deterministically
UPDATE listings
SET shipping_unknown = (shipping_native IS NULL)
WHERE shipping_unknown IS NULL;

-- 6) Backfill total_native deterministically (shipping_unknown policy)
UPDATE listings
SET total_native = price_native + COALESCE(shipping_native, 0)
WHERE total_native IS NULL AND price_native IS NOT NULL;

-- 7) Best-effort FX backfill (currency -> fx_rates snapshot)
UPDATE listings l
SET fx_rate_to_usd = r.rate_to_usd
FROM fx_rates r
WHERE
  l.fx_rate_to_usd IS NULL
  AND UPPER(l.currency) = UPPER(r.currency);

-- USD fallback (should already be present via fx_rates)
UPDATE listings
SET fx_rate_to_usd = 1.0
WHERE fx_rate_to_usd IS NULL AND UPPER(currency) = 'USD';

-- Set fx_timestamp where we can map the currency to fx_rates
UPDATE listings l
SET fx_timestamp = r.updated_at
FROM fx_rates r
WHERE
  l.fx_timestamp IS NULL
  AND l.fx_rate_to_usd IS NOT NULL
  AND UPPER(l.currency) = UPPER(r.currency);

-- Compute total_usd where we have both total_native + fx_rate_to_usd
UPDATE listings
SET total_usd = (total_native * fx_rate_to_usd)
WHERE
  total_usd IS NULL
  AND total_native IS NOT NULL
  AND fx_rate_to_usd IS NOT NULL;

-- 8) Backfill fx_status
UPDATE listings
SET fx_status = CASE WHEN total_usd IS NULL THEN 'MISSING' ELSE 'OK' END
WHERE fx_status IS DISTINCT FROM CASE WHEN total_usd IS NULL THEN 'MISSING' ELSE 'OK' END;

-- 9) Set defaults / constraints
ALTER TABLE listings
  ALTER COLUMN snapshot_at SET NOT NULL,
  ALTER COLUMN snapshot_at SET DEFAULT NOW(),
  ALTER COLUMN ingested_at SET NOT NULL,
  ALTER COLUMN ingested_at SET DEFAULT NOW(),
  ALTER COLUMN shipping_unknown SET NOT NULL,
  ALTER COLUMN shipping_unknown SET DEFAULT FALSE,
  ALTER COLUMN fx_status SET NOT NULL,
  ALTER COLUMN fx_status SET DEFAULT 'OK';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_fx_status_check'
  ) THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_fx_status_check
      CHECK (fx_status IN ('OK', 'MISSING'));
  END IF;
END
$$;

-- 10) Optional indexes for future query stability
CREATE INDEX IF NOT EXISTS listings_snapshot_at_desc_idx
  ON listings (snapshot_at DESC);

CREATE INDEX IF NOT EXISTS listings_fx_status_idx
  ON listings (fx_status);

COMMENT ON COLUMN listings.snapshot_at IS 'Observed time for the listing snapshot (Option A Phase 1)';
COMMENT ON COLUMN listings.ingested_at IS 'DB write time for the listing snapshot (Option A Phase 1)';
COMMENT ON COLUMN listings.shipping_unknown IS 'True when shipping_native is NULL for that snapshot (Option A Phase 1)';
COMMENT ON COLUMN listings.fx_status IS 'FX availability status for that listing snapshot (OK or MISSING) (Option A Phase 1)';
COMMENT ON COLUMN listings.fx_timestamp IS 'Timestamp of the fx_rates snapshot used to compute total_usd (Option A Phase 1)';

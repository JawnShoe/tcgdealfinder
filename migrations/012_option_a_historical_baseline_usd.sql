-- Migration: Option A Phase 2 - USD baseline fields on historical_prices
-- Run with: psql -d tcg_deals -f migrations/012_option_a_historical_baseline_usd.sql

-- Adds baseline_median_usd and metadata for Option A baselines computed from sold comps (total_usd).

ALTER TABLE historical_prices
  ADD COLUMN IF NOT EXISTS baseline_median_usd NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS baseline_sample_size_usd INTEGER,
  ADD COLUMN IF NOT EXISTS baseline_window_days INTEGER,
  ADD COLUMN IF NOT EXISTS baseline_outlier_trim_percent NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS baseline_status TEXT;

-- Backfill defaults for legacy rows (baseline is not yet computed)
UPDATE historical_prices
SET baseline_outlier_trim_percent = COALESCE(baseline_outlier_trim_percent, 5.00)
WHERE baseline_outlier_trim_percent IS NULL;

UPDATE historical_prices
SET baseline_status = COALESCE(baseline_status, 'INSUFFICIENT_DATA')
WHERE baseline_status IS NULL;

ALTER TABLE historical_prices
  ALTER COLUMN baseline_outlier_trim_percent SET NOT NULL,
  ALTER COLUMN baseline_outlier_trim_percent SET DEFAULT 5.00,
  ALTER COLUMN baseline_status SET NOT NULL,
  ALTER COLUMN baseline_status SET DEFAULT 'OK';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'historical_prices_baseline_status_check'
  ) THEN
    ALTER TABLE historical_prices
      ADD CONSTRAINT historical_prices_baseline_status_check
      CHECK (baseline_status IN ('OK', 'INSUFFICIENT_DATA'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS historical_prices_baseline_status_idx
  ON historical_prices (baseline_status);

COMMENT ON COLUMN historical_prices.baseline_median_usd IS 'Option A baseline median in USD derived from sold comps total_usd (Phase 2)';
COMMENT ON COLUMN historical_prices.baseline_sample_size_usd IS 'Eligible sold comps count used to compute baseline_median_usd (Phase 2)';
COMMENT ON COLUMN historical_prices.baseline_window_days IS 'Lookback window used for baseline_median_usd (expected 90 primary, 180 fallback) (Phase 2)';
COMMENT ON COLUMN historical_prices.baseline_outlier_trim_percent IS 'Percent trimmed from each tail before median computation (Phase 2)';
COMMENT ON COLUMN historical_prices.baseline_status IS 'Baseline availability status (OK or INSUFFICIENT_DATA) (Phase 2)';

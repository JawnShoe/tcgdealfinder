-- Migration: Add FX rates table and update listings for multi-currency support
-- Run with: psql -d tcg_deals -f migrations/001_add_fx_rates.sql

-- 1. Create FX rates table
CREATE TABLE IF NOT EXISTS fx_rates (
  id SERIAL PRIMARY KEY,
  currency VARCHAR(3) NOT NULL UNIQUE,
  rate_to_usd NUMERIC(10, 6) NOT NULL CHECK (rate_to_usd > 0),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- 2. Seed initial rates (manual fallback, update via CLI script later)
INSERT INTO fx_rates (currency, rate_to_usd, notes)
VALUES
  ('USD', 1.000000, 'Base currency'),
  ('CAD', 0.720000, 'Canadian Dollar - update manually'),
  ('GBP', 1.270000, 'British Pound - update manually'),
  ('AUD', 0.640000, 'Australian Dollar - update manually')
ON CONFLICT (currency) DO NOTHING;

-- 3. Add new columns to listings table for native currency tracking
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS price_native NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS shipping_native NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS total_native NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fx_rate_to_usd NUMERIC(10, 6),
ADD COLUMN IF NOT EXISTS total_usd NUMERIC(10, 2);

-- 4. Backfill existing US listings (assuming they're all USD)
UPDATE listings
SET
  currency = 'USD',
  price_native = price_cad,
  shipping_native = shipping_cad,
  total_native = total_price_cad,
  fx_rate_to_usd = 1.0,
  total_usd = total_price_cad
WHERE market = 'EBAY_US' AND currency IS NULL;

-- 5. Drop old unique constraint on listing_id (doesn't account for market)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_id_key;

-- 6. Add new unique constraint on listing_id + market
CREATE UNIQUE INDEX IF NOT EXISTS listings_listing_id_market_unique 
ON listings(listing_id, market);

-- 7. Create index on market for filtering
CREATE INDEX IF NOT EXISTS listings_market_idx ON listings(market);

-- 8. Create index on currency for joins
CREATE INDEX IF NOT EXISTS listings_currency_idx ON listings(currency);

COMMENT ON TABLE fx_rates IS 'Exchange rates for currency conversion to USD baseline';
COMMENT ON COLUMN listings.currency IS 'Native currency of the listing (USD/CAD/GBP/AUD)';
COMMENT ON COLUMN listings.price_native IS 'Price in native currency';
COMMENT ON COLUMN listings.shipping_native IS 'Shipping cost in native currency';
COMMENT ON COLUMN listings.total_native IS 'Total cost in native currency (price + shipping)';
COMMENT ON COLUMN listings.fx_rate_to_usd IS 'FX rate used for conversion (native -> USD)';
COMMENT ON COLUMN listings.total_usd IS 'Total cost normalized to USD for sorting/comparison';

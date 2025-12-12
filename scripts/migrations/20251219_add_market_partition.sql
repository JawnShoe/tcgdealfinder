ALTER TABLE listings
  ALTER COLUMN market SET DEFAULT 'EBAY_US';

CREATE INDEX IF NOT EXISTS listings_market_idx ON listings (market);
CREATE INDEX IF NOT EXISTS listings_market_card_id_idx ON listings (market, card_id);

ALTER TABLE ebay_sold_listings
  ADD COLUMN IF NOT EXISTS market TEXT;

UPDATE ebay_sold_listings
SET market = 'EBAY_US'
WHERE market IS NULL;

ALTER TABLE ebay_sold_listings
  ALTER COLUMN market SET DEFAULT 'EBAY_US',
  ALTER COLUMN market SET NOT NULL;

ALTER TABLE historical_prices
  ADD COLUMN IF NOT EXISTS market TEXT;

UPDATE historical_prices
SET market = 'EBAY_US'
WHERE market IS NULL;

ALTER TABLE historical_prices
  ALTER COLUMN market SET DEFAULT 'EBAY_US',
  ALTER COLUMN market SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE historical_prices
    DROP CONSTRAINT IF EXISTS historical_prices_card_id_key;
EXCEPTION
  WHEN undefined_object THEN NULL;
END
$$;

ALTER TABLE historical_prices
  ADD CONSTRAINT historical_prices_card_market_key UNIQUE (card_id, market);

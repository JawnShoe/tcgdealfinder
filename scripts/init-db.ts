import { query } from "../lib/db";

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  set_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (language IN ('EN','JP','UNKNOWN')),
  collector_number_raw TEXT,
  collector_number_norm TEXT,
  collector_number_confidence TEXT NOT NULL DEFAULT 'NONE' CHECK (collector_number_confidence IN ('NONE','LOW','MED','HIGH')),
  collector_number_signals TEXT[],
  condition_bucket TEXT NOT NULL, -- e.g. 'raw_nm', 'raw_lp', 'psa_10'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (name, set_name, card_number, condition_bucket)
);

CREATE TABLE IF NOT EXISTS historical_prices (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'EBAY_US',
  median_price_cad NUMERIC(10, 2) NOT NULL,
  sample_size INTEGER NOT NULL,
  last_updated_at TIMESTAMP NOT NULL,
  UNIQUE (card_id, market)
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL,
  source TEXT NOT NULL,                 -- 'EBAY'
  listing_id TEXT NOT NULL,             -- eBay item ID
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  price_cad NUMERIC(10, 2) NOT NULL,
  shipping_cad NUMERIC(10, 2),
  total_price_cad NUMERIC(10, 2),
  shipping_known BOOLEAN NOT NULL DEFAULT TRUE,
  shipping_source TEXT,
  seller TEXT,
  seller_feedback_count INTEGER,
  seller_positive_percent NUMERIC(5, 2),
  seller_username TEXT,
  condition_raw TEXT,
  market TEXT NOT NULL DEFAULT 'EBAY_US', -- e.g. 'EBAY_US', 'EBAY_CA'
  ends_at TIMESTAMP,
  historic_price_cad NUMERIC(10, 2),
  discount_percent NUMERIC(6, 2),
  match_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  match_reject_reason TEXT,
  reject_source TEXT,
  reject_detail TEXT,
  collector_number_raw TEXT,
  collector_number_norm TEXT,
  collector_number_confidence TEXT NOT NULL DEFAULT 'NONE' CHECK (collector_number_confidence IN ('NONE','LOW','MED','HIGH')),
  collector_number_signals TEXT[],
  detected_collector_number TEXT,
  deal_confidence_weight NUMERIC(5, 3),
  detected_language TEXT NOT NULL DEFAULT 'unknown',
  integrity_status TEXT NOT NULL DEFAULT 'OK',
  integrity_reason TEXT,
  integrity_score INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (listing_id)
);

CREATE INDEX IF NOT EXISTS listings_market_idx ON listings (market);
CREATE INDEX IF NOT EXISTS listings_market_card_id_idx ON listings (market, card_id);
CREATE INDEX IF NOT EXISTS listings_integrity_status_idx ON listings (integrity_status);

CREATE TABLE IF NOT EXISTS ebay_sold_listings (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'EBAY_US',
  condition TEXT NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  sold_at TIMESTAMP,
  raw JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_search_config (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  market TEXT NOT NULL,                 -- e.g. 'EBAY_US', 'EBAY_CA'
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (card_id, search_query, market)
);

CREATE TABLE IF NOT EXISTS seller_blacklist (
  id SERIAL PRIMARY KEY,
  seller_username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_blacklist_history (
  id SERIAL PRIMARY KEY,
  seller_username TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rejected_listings (
  id SERIAL PRIMARY KEY,
  ebay_item_id TEXT,
  seller_username TEXT,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts_watchlist (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  threshold_type TEXT NOT NULL,
  threshold_value NUMERIC(10, 2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alerts_log (
  id SERIAL PRIMARY KEY,
  watch_id INTEGER NOT NULL REFERENCES alerts_watchlist(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  listing_id INTEGER,
  total_price_cad NUMERIC(10, 2),
  median_price_cad NUMERIC(10, 2),
  discount_percent NUMERIC(6, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_subscriptions (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  min_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 5,
  unsubscribe_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS email_subscriptions_active_idx
  ON email_subscriptions (card_id, lower(email))
  WHERE unsubscribed_at IS NULL;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS seller_feedback_count INTEGER;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS seller_positive_percent NUMERIC(5, 2);

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS seller_username TEXT;

ALTER TABLE seller_blacklist
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS catalog_sets (
  id SERIAL PRIMARY KEY,
  tcgplayer_group_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  code TEXT,
  release_date DATE,
  category TEXT NOT NULL DEFAULT 'pokemon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_cards (
  id SERIAL PRIMARY KEY,
  catalog_set_id INTEGER NOT NULL REFERENCES catalog_sets(id) ON DELETE CASCADE,
  tcgplayer_product_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  number TEXT,
  rarity TEXT,
  supertype TEXT,
  subtypes TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS catalog_cards_set_number_idx
  ON catalog_cards (catalog_set_id, number);
`;

async function main() {
  await query(createTablesSQL);
  console.log("Database initialized (tables created if they were missing).");
}

main().catch((err) => {
  console.error("Failed to initialize database:", err);
});

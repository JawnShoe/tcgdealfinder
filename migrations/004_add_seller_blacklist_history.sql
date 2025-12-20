CREATE TABLE IF NOT EXISTS seller_blacklist_history (
  id SERIAL PRIMARY KEY,
  seller_username TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- T2-8: Add email_sends table for per-listing idempotency
-- Each (subscription_id, listing_id) pair can only have one row,
-- ensuring each subscriber receives at most ONE email per listing.

CREATE TABLE IF NOT EXISTS email_sends (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES email_subscriptions(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint enforces one-email-per-listing per subscriber
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_subscription_listing_idx
  ON email_sends (subscription_id, listing_id);

-- Index for cleanup queries (finding old sends)
CREATE INDEX IF NOT EXISTS email_sends_created_at_idx
  ON email_sends (created_at);

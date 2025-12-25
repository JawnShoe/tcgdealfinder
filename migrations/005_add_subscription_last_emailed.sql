-- Migration: Add last_emailed_at to email_subscriptions for spam prevention
-- This column tracks when the last alert email was sent to each subscriber
-- to enforce a per-subscription cooldown period.

ALTER TABLE email_subscriptions
  ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ;

-- Index to quickly find subscriptions that haven't been emailed recently
CREATE INDEX IF NOT EXISTS email_subscriptions_last_emailed_idx
  ON email_subscriptions (last_emailed_at)
  WHERE unsubscribed_at IS NULL;

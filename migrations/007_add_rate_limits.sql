-- Migration: Add rate_limits table for API abuse prevention
-- Implements sliding-window rate limiting with DB-backed storage
-- (required for serverless/edge where in-memory state is not shared)

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  -- Key format: "{route}:{ip}" e.g., "/api/alerts/subscribe:192.168.1.1"
  rate_key TEXT NOT NULL,
  -- Timestamp of the request (for sliding window calculation)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups by key + time range (sliding window queries)
CREATE INDEX IF NOT EXISTS rate_limits_key_created_idx
  ON rate_limits (rate_key, created_at DESC);

-- Index for efficient cleanup of old entries
CREATE INDEX IF NOT EXISTS rate_limits_created_idx
  ON rate_limits (created_at);

-- Function to clean up old rate limit entries (call periodically or via cron)
-- Deletes entries older than 1 hour (generous buffer beyond any window size)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

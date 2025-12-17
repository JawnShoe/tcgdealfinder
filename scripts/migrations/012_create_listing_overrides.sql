-- Migration: Create listing_overrides table
-- Purpose: Database-backed overrides for allow/block actions in debug exclusions
-- Date: 2025-12-16

-- Create enum for override types
CREATE TYPE override_type AS ENUM ('ALLOW', 'HARD_BLOCK', 'SOFT_EXCLUDE');

-- Create listing_overrides table
CREATE TABLE IF NOT EXISTS listing_overrides (
  listing_id TEXT PRIMARY KEY,
  override_type override_type NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'debug',
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_listing_overrides_override_type ON listing_overrides(override_type);
CREATE INDEX idx_listing_overrides_created_at ON listing_overrides(created_at DESC);
CREATE INDEX idx_listing_overrides_expires_at ON listing_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE listing_overrides IS 'Debug overrides for listing allow/block actions';
COMMENT ON COLUMN listing_overrides.listing_id IS 'eBay listing ID (matches listings.listing_id)';
COMMENT ON COLUMN listing_overrides.override_type IS 'ALLOW bypasses all exclusions, HARD_BLOCK forces exclusion, SOFT_EXCLUDE marks as merch';
COMMENT ON COLUMN listing_overrides.reason IS 'Human-readable reason for the override';
COMMENT ON COLUMN listing_overrides.created_by IS 'Who created the override (debug user ID or "debug" for anonymous)';
COMMENT ON COLUMN listing_overrides.expires_at IS 'Optional expiration for temporary overrides';

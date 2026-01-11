-- migrations/015_add_rebuild_observability.sql
-- Add rebuild observability tables for API metrics and outbound clicks
-- Date: 2026-01-11

CREATE TABLE IF NOT EXISTS rebuild_api_requests (
  id BIGSERIAL PRIMARY KEY,
  route TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rebuild_api_requests_created_at
  ON rebuild_api_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rebuild_api_requests_route
  ON rebuild_api_requests (route);

CREATE TABLE IF NOT EXISTS rebuild_outbound_clicks (
  id BIGSERIAL PRIMARY KEY,
  listing_id TEXT NULL,
  url TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rebuild_outbound_clicks_created_at
  ON rebuild_outbound_clicks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rebuild_outbound_clicks_listing_id
  ON rebuild_outbound_clicks (listing_id);

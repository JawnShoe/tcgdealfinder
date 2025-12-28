-- Migration: Option A - FX rate run tracking (hold last-known + drift metadata)
-- Run with: psql -d tcg_deals -f migrations/009_option_a_fx_rate_runs.sql

CREATE TABLE IF NOT EXISTS fx_rate_runs (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  cadence TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'DRIFT_SUSPECT', 'FAILED')),
  max_drift_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
  drift_details_json JSONB,
  failure_reason TEXT,
  raw_payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fx_rate_runs_completed_at_desc_idx
  ON fx_rate_runs (completed_at DESC);

COMMENT ON TABLE fx_rate_runs IS 'FX provider run log: last success vs last drift/failed attempt (Option A Phase 0 instrumentation)';

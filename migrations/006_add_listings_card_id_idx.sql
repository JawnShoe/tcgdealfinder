-- Migration: Add standalone index on listings(card_id) for card detail query performance
-- This addresses the HIGH ROI perf issue identified in the 2025-12-25 audit.
-- The existing listings_market_card_id_idx (market, card_id) only helps when market is also filtered.
-- This standalone index improves card-only lookups (e.g., /cards/[cardId] page).

CREATE INDEX IF NOT EXISTS listings_card_id_idx
  ON listings (card_id);

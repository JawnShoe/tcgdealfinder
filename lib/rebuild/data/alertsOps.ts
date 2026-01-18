import { query } from "@/lib/db";

// =============================================================================
// TYPES
// =============================================================================

export interface WatchRow {
  id: number;
  card_id: number;
  card_name: string;
  set_name: string;
  card_number: string | null;
  condition: string | null;
  threshold_type: "price_below" | "discount_at_least";
  threshold_value: number;
  active: boolean;
  note: string | null;
  created_at: Date;
  last_checked_at: Date | null;
  last_triggered_at: Date | null;
}

export interface AlertLogRow {
  id: number;
  watch_id: number;
  card_id: number;
  card_name: string;
  set_name: string;
  card_number: string | null;
  condition: string | null;
  total_price_cad: number | null;
  median_price_cad: number | null;
  discount_percent: number | null;
  created_at: Date;
}

// =============================================================================
// LIST WATCHES
// =============================================================================

export async function listWatches(): Promise<WatchRow[]> {
  const result = await query<{
    id: number;
    card_id: number;
    card_name: string;
    set_name: string;
    card_number: string | null;
    condition: string | null;
    threshold_type: string;
    threshold_value: string | number;
    active: boolean;
    note: string | null;
    created_at: string;
    last_checked_at: string | null;
    last_triggered_at: string | null;
  }>(
    `
      SELECT
        w.id,
        w.card_id,
        c.name AS card_name,
        c.set_name,
        c.card_number,
        w.condition,
        w.threshold_type,
        w.threshold_value,
        w.active,
        w.note,
        w.created_at,
        w.last_checked_at,
        w.last_triggered_at
      FROM alerts_watchlist w
      JOIN cards c ON c.id = w.card_id
      ORDER BY w.created_at DESC;
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    card_id: row.card_id,
    card_name: row.card_name,
    set_name: row.set_name,
    card_number: row.card_number,
    condition: row.condition,
    threshold_type: row.threshold_type as "price_below" | "discount_at_least",
    threshold_value:
      typeof row.threshold_value === "number"
        ? row.threshold_value
        : Number(row.threshold_value),
    active: row.active,
    note: row.note,
    created_at: new Date(row.created_at),
    last_checked_at: row.last_checked_at ? new Date(row.last_checked_at) : null,
    last_triggered_at: row.last_triggered_at
      ? new Date(row.last_triggered_at)
      : null,
  }));
}

// =============================================================================
// LIST RECENT ALERTS
// =============================================================================

export async function listRecentAlerts(limit = 50): Promise<AlertLogRow[]> {
  const result = await query<{
    id: number;
    watch_id: number;
    card_id: number;
    card_name: string;
    set_name: string;
    card_number: string | null;
    condition: string | null;
    total_price_cad: string | null;
    median_price_cad: string | null;
    discount_percent: string | null;
    created_at: string;
  }>(
    `
      SELECT
        l.id,
        l.watch_id,
        l.card_id,
        c.name AS card_name,
        c.set_name,
        c.card_number,
        l.condition,
        l.total_price_cad,
        l.median_price_cad,
        l.discount_percent,
        l.created_at
      FROM alerts_log l
      JOIN cards c ON c.id = l.card_id
      ORDER BY l.created_at DESC
      LIMIT $1;
    `,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    watch_id: row.watch_id,
    card_id: row.card_id,
    card_name: row.card_name,
    set_name: row.set_name,
    card_number: row.card_number,
    condition: row.condition,
    total_price_cad:
      row.total_price_cad != null ? Number(row.total_price_cad) : null,
    median_price_cad:
      row.median_price_cad != null ? Number(row.median_price_cad) : null,
    discount_percent:
      row.discount_percent != null ? Number(row.discount_percent) : null,
    created_at: new Date(row.created_at),
  }));
}

// =============================================================================
// CREATE WATCH
// =============================================================================

export async function createWatch(payload: {
  cardId: number;
  condition: string;
  thresholdType: "price_below" | "discount_at_least";
  thresholdValue: number;
  note?: string;
}): Promise<{ id: number }> {
  const { cardId, condition, thresholdType, thresholdValue, note } = payload;

  const result = await query<{ id: number }>(
    `
      INSERT INTO alerts_watchlist (
        card_id,
        condition,
        threshold_type,
        threshold_value,
        active,
        note,
        created_at
      )
      VALUES ($1, $2, $3, $4, TRUE, $5, NOW())
      RETURNING id;
    `,
    [cardId, condition, thresholdType, thresholdValue, note ?? null]
  );

  return { id: result.rows[0].id };
}

// =============================================================================
// TOGGLE WATCH
// =============================================================================

export async function toggleWatch(
  id: number,
  active: boolean
): Promise<boolean> {
  const result = await query(
    `
      UPDATE alerts_watchlist
      SET active = $2
      WHERE id = $1
      RETURNING id;
    `,
    [id, active]
  );

  return result.rows.length > 0;
}

// =============================================================================
// DELETE WATCH
// =============================================================================

export async function deleteWatch(id: number): Promise<boolean> {
  const result = await query(
    `
      DELETE FROM alerts_watchlist
      WHERE id = $1
      RETURNING id;
    `,
    [id]
  );

  return result.rows.length > 0;
}

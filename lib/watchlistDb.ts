import "server-only";

import { query } from "./db";

export type WatchlistCard = {
  cardId: number;
  name: string;
  setName: string;
  cardNumber: string | null;
  conditionBucket: string | null;
  createdAt: string;
};

type WatchlistCardRow = {
  card_id: number;
  name: string;
  set_name: string;
  card_number: string | null;
  condition_bucket: string | null;
  created_at: string;
};

export async function fetchWatchlistCards(
  ownerId: string
): Promise<WatchlistCard[]> {
  const res = await query<WatchlistCardRow>(
    `
      SELECT
        w.card_id,
        c.name,
        c.set_name,
        c.card_number,
        c.condition_bucket,
        w.created_at
      FROM watchlist_entries w
      JOIN cards c ON c.id = w.card_id
      WHERE w.owner_id = $1
      ORDER BY w.created_at DESC;
    `,
    [ownerId]
  );

  return res.rows.map((row) => ({
    cardId: row.card_id,
    name: row.name,
    setName: row.set_name,
    cardNumber: row.card_number,
    conditionBucket: row.condition_bucket,
    createdAt: row.created_at,
  }));
}

type WatchedCardIdRow = { card_id: number };

export async function fetchWatchedCardIdSet(
  ownerId: string,
  cardIds: number[]
): Promise<Set<number>> {
  const uniqueIds = Array.from(new Set(cardIds))
    .filter((id) => id > 0)
    .slice(0, 500);
  if (uniqueIds.length === 0) {
    return new Set();
  }

  const res = await query<WatchedCardIdRow>(
    `
      SELECT w.card_id
      FROM watchlist_entries w
      WHERE w.owner_id = $1
        AND w.card_id = ANY($2);
    `,
    [ownerId, uniqueIds]
  );

  return new Set(res.rows.map((row) => row.card_id));
}

export async function upsertWatchlistEntry(
  ownerId: string,
  cardId: number
): Promise<void> {
  await query(
    `
      INSERT INTO watchlist_entries (owner_id, card_id)
      VALUES ($1, $2)
      ON CONFLICT (owner_id, card_id) DO NOTHING;
    `,
    [ownerId, cardId]
  );
}

export async function deleteWatchlistEntry(
  ownerId: string,
  cardId: number
): Promise<number> {
  const res = await query<{ deleted: string }>(
    `
      WITH deleted AS (
        DELETE FROM watchlist_entries
        WHERE owner_id = $1
          AND card_id = $2
        RETURNING 1
      )
      SELECT COUNT(*)::bigint AS deleted FROM deleted;
    `,
    [ownerId, cardId]
  );
  return Number(res.rows[0]?.deleted ?? 0);
}

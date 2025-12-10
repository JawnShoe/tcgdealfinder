import { query } from "./db";

export type CardSearchResult = {
  id: number;
  name: string;
  setName: string;
  cardNumber: string | null;
  condition: string | null;
};

function buildLikePattern(raw: string): string {
  const escaped = raw.replace(/[%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

export async function searchCards(
  searchTerm: string,
  limit = 20,
): Promise<CardSearchResult[]> {
  if (!searchTerm.trim()) {
    return [];
  }

  const like = buildLikePattern(searchTerm.trim());

  const res = await query<{
    id: number;
    name: string;
    set_name: string;
    card_number: string | null;
    condition_bucket: string | null;
  }>(
    `
      SELECT
        id,
        name,
        set_name,
        card_number,
        condition_bucket
      FROM cards
      WHERE
        name ILIKE $1 ESCAPE '\\'
        OR set_name ILIKE $1 ESCAPE '\\'
        OR card_number ILIKE $1 ESCAPE '\\'
      ORDER BY name ASC
      LIMIT $2
    `,
    [like, limit],
  );

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    setName: row.set_name,
    cardNumber: row.card_number,
    condition: row.condition_bucket,
  }));
}

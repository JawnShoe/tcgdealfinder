import Link from "next/link";

import { query } from "../../lib/db";

type SetSummary = {
  id: number;
  name: string;
  code: string | null;
  releaseDate: string | null;
  catalogCardCount: number;
  cardsWithDeals: number;
};

type CatalogSetRow = {
  id: number;
  name: string;
  code: string | null;
  release_date: string | null;
  tcgplayer_group_id: number | null;
  catalog_card_count: string;
  cards_with_deals: string;
};

type LegacySetRow = {
  set_name: string;
  card_count: string;
  active_count: string;
};

function encodeSetSlug(name: string): string {
  return encodeURIComponent(name);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

async function getCatalogSetsWithDeals(): Promise<SetSummary[]> {
  const res = await query<CatalogSetRow>(
    `
      WITH active_listings AS (
        SELECT DISTINCT l.card_id
        FROM listings l
        WHERE l.total_price_cad IS NOT NULL
          AND l.historic_price_cad IS NOT NULL
          AND l.seller_username IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM seller_blacklist sb
            WHERE sb.seller_username = l.seller_username
          )
      ),
      cards_with_deals AS (
        SELECT
          LOWER(c.set_name) AS set_name_key,
          COUNT(DISTINCT c.id)::bigint AS cards_with_deals
        FROM cards c
        JOIN active_listings al ON al.card_id = c.id
        GROUP BY LOWER(c.set_name)
      )
      SELECT
        cs.id,
        cs.name,
        cs.code,
        cs.release_date,
        cs.tcgplayer_group_id,
        COUNT(cc.*)::bigint AS catalog_card_count,
        COALESCE(cwd.cards_with_deals, 0)::bigint AS cards_with_deals
      FROM catalog_sets cs
      LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
      LEFT JOIN cards_with_deals cwd ON cwd.set_name_key = LOWER(cs.name)
      WHERE cs.category = 'pokemon'
      GROUP BY cs.id, cs.name, cs.code, cs.release_date, cs.tcgplayer_group_id, cwd.cards_with_deals
      ORDER BY cs.release_date DESC NULLS LAST, cs.name ASC;
    `,
  );

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    releaseDate: row.release_date,
    catalogCardCount: Number(row.catalog_card_count),
    cardsWithDeals: Number(row.cards_with_deals),
  }));
}

async function getLegacySets(): Promise<SetSummary[]> {
  const res = await query<LegacySetRow>(
    `
      WITH active_cards AS (
        SELECT DISTINCT l.card_id
        FROM listings l
        WHERE l.total_price_cad IS NOT NULL
          AND l.historic_price_cad IS NOT NULL
          AND l.seller_username IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM seller_blacklist sb
            WHERE sb.seller_username = l.seller_username
          )
      )
      SELECT
        c.set_name,
        COUNT(*)::bigint AS card_count,
        COUNT(DISTINCT CASE WHEN ac.card_id IS NOT NULL THEN c.id END)::bigint AS active_count
      FROM cards c
      LEFT JOIN active_cards ac ON ac.card_id = c.id
      GROUP BY c.set_name
      ORDER BY c.set_name;
    `,
  );

  return res.rows.map((row, index) => ({
    id: -(index + 1),
    name: row.set_name,
    code: null,
    releaseDate: null,
    catalogCardCount: Number(row.card_count),
    cardsWithDeals: Number(row.active_count),
  }));
}

async function getSets(): Promise<SetSummary[]> {
  try {
    return await getCatalogSetsWithDeals();
  } catch (error) {
    console.error("Falling back to legacy set list:", error);
    return getLegacySets();
  }
}

export default async function SetsPage() {
  const sets = await getSets();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">Browse by Set</h1>
        <p className="text-sm text-slate-500">
          Explore every Pokémon set we have catalog data for, see how many cards are imported, and jump into deals when
          available.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left">Set</th>
              <th className="px-2 py-2 text-left">Code</th>
              <th className="px-2 py-2 text-left">Release date</th>
              <th className="px-2 py-2 text-right">Catalog cards</th>
              <th className="px-2 py-2 text-right">Cards with deals</th>
              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-slate-500">
                  No catalog sets found. Run <code className="font-mono">npm run import:tcg-catalog</code> to load
                  TCGplayer data.
                </td>
              </tr>
            ) : (
              sets.map((set) => (
                <tr key={`${set.id}-${set.name}`}>
                  <td className="px-2 py-2 align-middle text-slate-900">{set.name}</td>
                  <td className="px-2 py-2 text-slate-600">{set.code ?? "-"}</td>
                  <td className="px-2 py-2 text-slate-600">{formatDate(set.releaseDate)}</td>
                  <td className="px-2 py-2 text-right">{set.catalogCardCount}</td>
                  <td className="px-2 py-2 text-right">{set.cardsWithDeals}</td>
                  <td className="px-2 py-2 text-right space-x-3">
                    {set.cardsWithDeals > 0 ? (
                      <Link
                        href={`/sets/${encodeSetSlug(set.name)}`}
                        className="text-sm text-sky-700 hover:underline"
                      >
                        View deals
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">No deals yet</span>
                    )}
                    {set.id > 0 ? (
                      <Link
                        href={`/catalog/sets/${set.id}`}
                        className="text-sm text-sky-700 hover:underline"
                      >
                        View all cards
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">Catalog sync pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

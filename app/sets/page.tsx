import Link from "next/link";

import { query } from "../../lib/db";
import { PAGE_TITLE, PAGE_SUBTITLE } from "../../lib/typography";

type SetSummary = {
  id: number;
  name: string;
  code: string | null;
  releaseDate: string | null;
  series: string | null;
  totalCards: number | null;
  symbolUrl: string | null;
  logoUrl: string | null;
  catalogCardCount: number;
  cardsWithDeals: number;
};

type CatalogSetRow = {
  id: number;
  name: string;
  code: string | null;
  release_date: string | null;
  tcgplayer_group_id: number | null;
  pokemontcg_series: string | null;
  pokemontcg_total_cards: number | null;
  symbol_url: string | null;
  logo_url: string | null;
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

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
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
        cs.pokemontcg_series,
        cs.pokemontcg_total_cards,
        cs.symbol_url,
        cs.logo_url,
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
    series: row.pokemontcg_series,
    totalCards: row.pokemontcg_total_cards,
    symbolUrl: row.symbol_url,
    logoUrl: row.logo_url,
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
    series: "Legacy catalog",
    totalCards: Number(row.card_count),
    symbolUrl: null,
    logoUrl: null,
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
  const grouped = groupSetsBySeries(sets);

  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-8 pb-8">
        <div className="space-y-2">
          <h1 className={PAGE_TITLE}>Browse by set</h1>
          <p className={PAGE_SUBTITLE}>
            Explore every Pokémon set with catalog coverage, see how many cards are imported, and jump directly into live
            deals when they exist.
          </p>
        </div>

      {grouped.length === 0 ? (
        <div className="panel text-center text-sm text-slate-500">
          No catalog sets found. Run <code className="font-mono">npm run ingest:pokemon-sets</code> to import the latest
          Pokémon sets.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.series} className="panel space-y-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-slate-900">{group.series}</h2>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {pluralize(group.sets.length, "set")} • newest release {formatRelative(group.newestRelease)}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {group.sets.map((set) => (
                  <article
                    key={`${group.series}-${set.name}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {renderSetIcon(set)}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{set.name}</h3>
                          <p className="text-xs uppercase text-slate-500">
                            {set.series ? `${set.series} • ` : ""}
                            Released {formatDate(set.releaseDate) ?? "—"} • {set.code ?? "No code"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>
                          Catalog cards: <span className="font-semibold text-slate-900">{set.catalogCardCount}</span>
                        </p>
                        <p>
                          With deals: <span className="font-semibold text-slate-900">{set.cardsWithDeals}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      {set.cardsWithDeals > 0 ? (
                        <Link
                          href={`/sets/${encodeSetSlug(set.name)}#deals`}
                          className="inline-flex items-center rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View deals
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded border border-dashed border-slate-300 px-3 py-1.5 text-slate-400">
                          No deals yet
                        </span>
                      )}
                      <Link
                        href={`/sets/${encodeSetSlug(set.name)}#catalog-cards`}
                        className="inline-flex items-center rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50"
                      >
                        View all cards
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}

function pluralize(count: number, noun: string): string {
  const safeCount = Number.isFinite(count) ? count : 0;
  return `${safeCount} ${safeCount === 1 ? noun : `${noun}s`}`;
}

type SeriesGroup = {
  series: string;
  sets: SetSummary[];
  newestRelease: number;
};

function groupSetsBySeries(sets: SetSummary[]): SeriesGroup[] {
  const map = new Map<string, SetSummary[]>();

  for (const set of sets) {
    const series = set.series?.trim() || "Other series";
    if (!map.has(series)) {
      map.set(series, []);
    }
    map.get(series)!.push(set);
  }

  const groups: SeriesGroup[] = Array.from(map.entries()).map(([series, seriesSets]) => {
    const sortedSets = [...seriesSets].sort(
      (a, b) => getReleaseTime(b.releaseDate) - getReleaseTime(a.releaseDate),
    );

    const newestRelease = Math.max(...seriesSets.map((set) => getReleaseTime(set.releaseDate)), 0);

    return {
      series,
      sets: sortedSets,
      newestRelease,
    };
  });

  return groups.sort((a, b) => b.newestRelease - a.newestRelease);
}

function getReleaseTime(value: string | null): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatRelative(timestamp: number): string {
  if (!timestamp) return "unknown";
  const date = new Date(timestamp);
  return formatDate(date) ?? "unknown";
}

function renderSetIcon(set: SetSummary): JSX.Element | null {
  const src = set.symbolUrl ?? set.logoUrl;
  if (!src) return null;
  return (
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${set.name} logo`}
        className="h-6 w-6 object-contain"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export const dynamic = 'force-dynamic';

import Link from "next/link";

import { query } from "../../lib/db";

type CatalogSetRow = {
  id: number;
  name: string;
  code: string | null;
  release_date: string | null;
  tcgplayer_group_id: number | null;
  card_count: string;
};

async function getCatalogSets(): Promise<CatalogSetRow[]> {
  const res = await query<CatalogSetRow>(
    `
      SELECT
        cs.id,
        cs.name,
        cs.code,
        cs.release_date,
        cs.tcgplayer_group_id,
        COUNT(cc.*)::bigint AS card_count
      FROM catalog_sets cs
      LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
      WHERE cs.category = 'pokemon'
      GROUP BY cs.id
      ORDER BY cs.release_date DESC NULLS LAST, cs.name ASC;
    `,
  );
  return res.rows;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export default async function CatalogPage() {
  let sets: CatalogSetRow[] = [];
  let hasCatalog = true;
  try {
    sets = await getCatalogSets();
  } catch (error) {
    console.error("Catalog query failed (did you run db:init?):", error);
    hasCatalog = false;
  }

  return (
    <main className="page-shell space-y-6 py-6">
      <div className="panel space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Catalog (TCGplayer)</h1>
        <p className="text-sm text-slate-600">
          Imported Pokémon sets and cards from TCGplayer. This view is for debugging / verification.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        {!hasCatalog ? (
          <div className="py-10 text-center text-sm text-rose-600">
            Catalog tables have not been created yet. Run <code className="font-mono">npm run db:init</code> followed by
            <code className="font-mono">npm run import:tcg-catalog</code> once your TCGplayer API keys are configured.
          </div>
        ) : sets.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No catalog data yet. Run <code className="font-mono">npm run import:tcg-catalog</code> after configuring
            your TCGplayer API keys.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="px-3 py-2">Set</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Release date</th>
                <th className="px-3 py-2">TCGplayer group</th>
                <th className="px-3 py-2 text-right">Catalog cards</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{set.name}</td>
                  <td className="px-3 py-2 text-slate-600">{set.code ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(set.release_date)}</td>
                  <td className="px-3 py-2 text-slate-600">{set.tcgplayer_group_id ?? "-"}</td>
                  <td className="px-3 py-2 text-right text-slate-900">{set.card_count}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/catalog/sets/${set.id}`}
                      className="text-sm text-sky-700 transition hover:text-sky-900"
                    >
                      View all cards
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import DealsTable from "@/components/DealsTable";
import FeaturedDealsStrip from "@/components/FeaturedDealsStrip";
import ListingLookup from "@/components/ListingLookup";
import { query } from "@/lib/db";
import { runDealsQuery } from "./api/deals/dealsQuery";
import type { DealsApiResponse } from "@/types/dealsApi";
import { DEFAULT_MARKET } from "@/lib/markets";
import { DEFAULT_MARKET_FILTER } from "@/lib/filters";
import { ensureListingsMarketColumn } from "@/lib/schema";

async function getHomePageDeals(): Promise<DealsApiResponse> {
  const PAGE_SIZE = 50;
  const market = DEFAULT_MARKET_FILTER;
  const hasMarketColumn = await ensureListingsMarketColumn();
  const marketClause = hasMarketColumn ? "AND l.market = $1" : "";

  const statsRes = await query<{
    total: string;
    excluded: string;
    shipping_unknown: string;
  }>(
    `
      SELECT
        COUNT(*)::bigint AS total,
        COALESCE(SUM(CASE WHEN l.match_eligible = FALSE THEN 1 ELSE 0 END), 0)::bigint AS excluded,
        COALESCE(SUM(CASE WHEN l.shipping_known = FALSE THEN 1 ELSE 0 END), 0)::bigint AS shipping_unknown
      FROM listings l
      WHERE
        l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
        ${marketClause}
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        );
    `,
    hasMarketColumn ? [market] : [],
  );
  const totalCandidates = Number(statsRes.rows[0]?.total ?? 0);
  const excludedByMatch = Number(statsRes.rows[0]?.excluded ?? 0);
  const excludedByShipping = Number(
    statsRes.rows[0]?.shipping_unknown ?? 0,
  );
  console.log(
    `[home] deals query: total_candidates=${totalCandidates}, excluded_by_match=${excludedByMatch}, shipping_unknown=${excludedByShipping}`,
  );

  return runDealsQuery({
    sort: "best",
    page: 1,
    pageSize: PAGE_SIZE,
    market,
  });
}

export default async function HomePage() {
  console.log("USING APP ROUTER: /");
  const initial = await getHomePageDeals();
  const deals = initial.items;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-4 pb-8 lg:pt-6 lg:pb-12 space-y-6">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Live Pokémon deals
          </h1>
          <p className="text-sm text-slate-600">
            Ranked by discount and price confidence
          </p>
        </div>

        {/* Featured deals */}
        <section>
          <FeaturedDealsStrip deals={deals} />
        </section>

        {/* All live deals */}
        <section>
          <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-5 sm:px-7 lg:px-10 deals-card">
            <ListingLookup />
            <h2 className="text-lg font-semibold tracking-tight mb-2">
              All live deals
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Filter by condition, region, discount, or price to focus on the safest listings for your collecting goals.
            </p>
            <DealsTable deals={deals} initialApiMeta={initial} />
          </div>
        </section>
      </div>
    </main>
  );
}

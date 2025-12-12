import Link from "next/link";
import DealsTable from "@/components/DealsTable";
import FeaturedDealsStrip from "@/components/FeaturedDealsStrip";
import ListingLookup from "@/components/ListingLookup";
import { query } from "@/lib/db";
import { runDealsQuery } from "./api/deals/dealsQuery";
import type { Deal } from "@/types/deal";

async function getHomePageDeals(): Promise<Deal[]> {
  const PAGE_SIZE = 50;

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
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        );
    `,
  );
  const totalCandidates = Number(statsRes.rows[0]?.total ?? 0);
  const excludedByMatch = Number(statsRes.rows[0]?.excluded ?? 0);
  const excludedByShipping = Number(
    statsRes.rows[0]?.shipping_unknown ?? 0,
  );
  console.log(
    `[home] deals query: total_candidates=${totalCandidates}, excluded_by_match=${excludedByMatch}, shipping_unknown=${excludedByShipping}`,
  );

  const response = await runDealsQuery({
    sort: "best",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  return response.items;
}

export default async function HomePage() {
  console.log("USING APP ROUTER: /");
  const deals = await getHomePageDeals();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-4 pb-8 lg:pt-6 lg:pb-12 space-y-5 lg:space-y-7">
        {/* Hero */}
        <section>
          <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-6 sm:px-7 lg:px-10">
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-center lg:gap-12 xl:gap-16">
              <div className="space-y-4 lg:pr-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
                  Real-time arbitrage radar
                </p>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
                    {"Find undervalued Pokemon cards in seconds."}
                  </h1>
                  <p className="text-sm md:text-base text-slate-600 max-w-2xl">
                    TCG Deal Finder scores every live eBay listing by discount, seller trust, and data confidence so you only spend time on the safest opportunities.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      href="/newest"
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Browse newest listings
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 sm:grid-cols-3 lg:pl-6">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Coverage</p>
                  <p className="text-base font-semibold text-slate-900">200+ live deals tracked</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Trusted sellers</p>
                  <p className="text-base font-semibold text-slate-900">40+ verified accounts</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Fresh data</p>
                  <p className="text-base font-semibold text-slate-900">Updated every day</p>
                </div>
              </div>
            </div>
          </div>
        </section>

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
            <DealsTable deals={deals} />
          </div>
        </section>
      </div>
    </main>
  );
}

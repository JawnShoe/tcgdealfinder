import Link from "next/link";
import DealsTable from "@/components/DealsTable";
import {
  FeaturedDeals,
  type FeaturedDealView,
} from "@/components/FeaturedDeals";
import ListingLookup from "@/components/ListingLookup";
import { query } from "@/lib/db";
import { runDealsQuery } from "./api/deals/dealsQuery";
import type { DealsApiResponse } from "@/types/dealsApi";
import { cookies, headers } from "next/headers";

import { ensureListingsMarketColumn } from "@/lib/schema";
import { isDealTrusted } from "@/lib/dealScore";
import {
  MARKET_COOKIE_NAME,
  getGeoCountryFromHeaders,
  resolveMarketPreference,
} from "@/lib/marketPreference";
import {
  USD_BASELINE_COOKIE_NAME,
  parseUsdBaselineCookie,
} from "@/lib/usdBaselinePreference";

async function getHomePageDeals(): Promise<DealsApiResponse> {
  const PAGE_SIZE = 50;
  const cookieMarket = cookies().get(MARKET_COOKIE_NAME)?.value ?? null;
  const geoCountry = getGeoCountryFromHeaders(headers());
  const market = resolveMarketPreference(cookieMarket, geoCountry);
  const hasMarketColumn = await ensureListingsMarketColumn();
  const marketClause =
    hasMarketColumn && market !== "all" ? "AND l.market = $1" : "";

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
    hasMarketColumn && market !== "all" ? [market] : []
  );
  const totalCandidates = Number(statsRes.rows[0]?.total ?? 0);
  const excludedByMatch = Number(statsRes.rows[0]?.excluded ?? 0);
  const excludedByShipping = Number(statsRes.rows[0]?.shipping_unknown ?? 0);
  console.log(
    `[home] deals query: total_candidates=${totalCandidates}, excluded_by_match=${excludedByMatch}, shipping_unknown=${excludedByShipping}`
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
  const featuredDeals = buildFeaturedDeals(deals);
  const referenceTime = Date.now();
  const showUsdBaseline = parseUsdBaselineCookie(
    cookies().get(USD_BASELINE_COOKIE_NAME)?.value
  );

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
          <FeaturedDeals
            deals={featuredDeals}
            initialShowUsdBaseline={showUsdBaseline}
          />
        </section>

        {/* All live deals */}
        <section>
          <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-5 sm:px-7 lg:px-10 deals-card">
            <ListingLookup />
            <h2 className="text-lg font-semibold tracking-tight mb-2">
              All live deals
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Filter by condition, region, discount, or price to focus on the
              safest listings for your collecting goals.
            </p>
            <DealsTable
              deals={deals}
              initialApiMeta={initial}
              referenceTime={referenceTime}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function buildFeaturedDeals(
  deals: DealsApiResponse["items"]
): FeaturedDealView[] {
  return deals
    .map<FeaturedDealView>((deal) => {
      const discount = deal.discountPercent ?? null;
      const price = deal.totalUsd ?? null;

      return {
        deal,
        price,
        discount,
        score: null,
        trustedSeller: isDealTrusted(
          deal.sellerFeedbackCount ?? null,
          deal.sellerPositivePercent ?? null
        ),
      };
    })
    .sort((a, b) => {
      const magA =
        a.discount != null ? Math.abs(a.discount) : Number.NEGATIVE_INFINITY;
      const magB =
        b.discount != null ? Math.abs(b.discount) : Number.NEGATIVE_INFINITY;
      return magB - magA;
    })
    .slice(0, 6);
}

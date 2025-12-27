export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

// Client-only to prevent SSR/CSR hydration mismatches
// The table contains components that use Date.now() or browser-dependent state
const TopDealsClient = nextDynamic(
  () => import("../../components/TopDealsClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    ),
  }
);
import { query } from "../../lib/db";
import type { Deal } from "../../types/deal";
import {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  TABLE_CONTAINER,
} from "../../lib/typography";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../lib/pricing";
import { computeDealConfidenceWeight } from "../../lib/dealConfidence";
import { cookies, headers } from "next/headers";

import {
  MARKET_COOKIE_NAME,
  getGeoCountryFromHeaders,
  resolveMarketPreference,
} from "../../lib/marketPreference";
import { DEFAULT_MARKET } from "../../lib/markets";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
  ensureDealConfidenceColumn,
  ensureHistoricalStdDevColumn,
  ensureListingsIntegrityColumns,
  LISTINGS_INTEGRITY_MISSING_MESSAGE,
} from "../../lib/schema";
import {
  getCardStockImageUrls,
  TCGPLAYER_ATTRIBUTION,
} from "../../lib/stockImages";
import { shouldExcludeListingFromCardSurfaces } from "../../lib/blacklist";
import {
  warnIfStoreNamesMissing,
  normalizeSellerStoreName,
} from "../../lib/sellerDisplay";
import { isAdminAuthenticated } from "../../lib/adminAuth";

const LIMIT = 100;
const MIN_SAMPLE_SIZE = 20;
const MIN_DISCOUNT = 15;
const MIN_SELLER_FEEDBACK_COUNT = 20;
const MIN_SELLER_POSITIVE_PERCENT = 98;
const SELLER_SEEN_WINDOW_DAYS = 30;

type TopDealRow = {
  listing_id: number;
  title: string;
  url: string;
  total_price_cad: string | null;
  total_usd: string | null;
  historic_price_cad: string | null;
  discount_percent: string | null;
  market: string;
  ends_at: string | null;
  updated_at: string | null;
  thumbnail_url: string | null;
  card_id: number | null;
  card_name: string | null;
  set_name: string | null;
  condition_bucket: string | null;
  sample_size: number | null;
  median_price_cad: string | null;
  std_dev_cad: string | null;
  shipping_cad: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  seller_username: string | null;
  seller_store_name: string | null;
  deal_confidence_weight: string | null;
  integrity_status: string | null;
  integrity_reason: string | null;
  integrity_score: number | null;
  // Native currency fields
  currency: string | null;
  price_native: string | null;
  shipping_native: string | null;
  total_native: string | null;
};

type SellerSeenCountRow = {
  seller_username: string | null;
  deal_count: string;
};

async function getTopDeals(): Promise<Deal[]> {
  const hasIntegrityColumns = await ensureListingsIntegrityColumns();
  if (!hasIntegrityColumns) {
    throw new Error(LISTINGS_INTEGRITY_MISSING_MESSAGE);
  }
  const cookieMarket = cookies().get(MARKET_COOKIE_NAME)?.value ?? null;
  const geoCountry = getGeoCountryFromHeaders(headers());
  const market = resolveMarketPreference(cookieMarket, geoCountry);
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const hasDealConfidenceColumn = await ensureDealConfidenceColumn();
  const hasStdDevColumn = await ensureHistoricalStdDevColumn();

  const historicalMarket = market === "all" ? DEFAULT_MARKET : market;
  const marketLiteral = `'${historicalMarket}'::text`;
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn && market !== "all"
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const marketFilterClause =
    hasListingsMarketColumn && market !== "all" ? "AND l.market = $5" : "";
  const confidenceSelect = hasDealConfidenceColumn
    ? "l.deal_confidence_weight"
    : "NULL::numeric";
  const stdDevSelect = hasStdDevColumn ? "hp.std_dev_cad" : "NULL::numeric";

  const res = await query<TopDealRow>(
    `
      SELECT
        l.id AS listing_id,
        l.title,
        l.url,
        l.total_price_cad,
        l.total_usd,
        l.historic_price_cad,
        l.discount_percent,
        ${marketSelect} AS market,
        l.ends_at,
        l.updated_at,
        l.thumbnail_url,
        c.id   AS card_id,
        c.name AS card_name,
        c.set_name,
        c.condition_bucket,
        hp.sample_size,
        hp.median_price_cad,
        ${stdDevSelect} AS std_dev_cad,
        l.shipping_cad,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.seller_username,
        l.seller_store_name,
        ${confidenceSelect} AS deal_confidence_weight
        , l.integrity_status
        , l.integrity_reason
        , l.integrity_score
        , l.currency
        , l.price_native
        , l.shipping_native
        , l.total_native
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE
        l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND hp.sample_size IS NOT NULL
        AND hp.sample_size >= $1
        AND l.seller_feedback_count IS NOT NULL
        AND l.seller_feedback_count >= $2
        AND l.seller_positive_percent IS NOT NULL
        AND l.seller_positive_percent >= $3
        AND l.seller_username IS NOT NULL
        AND l.shipping_known = TRUE
        AND (
          l.match_eligible = TRUE
          OR (
            l.match_eligible = FALSE
            AND l.match_reject_reason IN (
              'language_mismatch',
              'collector_number_mismatch'
            )
            AND EXISTS (
              SELECT 1
              FROM listing_overrides lo
              WHERE lo.listing_id = l.listing_id
                AND lo.override_type = 'ALLOW'
                AND lo.reason IN (
                  'manual_allow:language_mismatch',
                  'manual_allow:collector_number_mismatch'
                )
            )
          )
        )
        ${marketFilterClause}
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY
        l.discount_percent ASC NULLS LAST,
        l.total_price_cad ASC,
        l.ends_at ASC NULLS LAST
      LIMIT $4;
    `,
    [
      MIN_SAMPLE_SIZE,
      MIN_SELLER_FEEDBACK_COUNT,
      MIN_SELLER_POSITIVE_PERCENT,
      LIMIT,
      ...(hasListingsMarketColumn && market !== "all" ? [market] : []),
    ]
  );

  const deals = res.rows
    .map((row: TopDealRow): Deal | null => {
      const total = row.total_price_cad ? Number(row.total_price_cad) : null;
      const totalUsd = row.total_usd ? Number(row.total_usd) : null;
      const historic = row.historic_price_cad
        ? Number(row.historic_price_cad)
        : null;
      const sampleSize =
        row.sample_size != null ? Number(row.sample_size) : null;
      const sellerFeedbackCount =
        row.seller_feedback_count != null
          ? Number(row.seller_feedback_count)
          : null;
      const sellerPositivePercent =
        row.seller_positive_percent != null
          ? Number(row.seller_positive_percent)
          : null;

      let rawDiscount = computeDiscountPercent(total, historic);
      if (rawDiscount == null && row.discount_percent != null) {
        const parsed = Number(row.discount_percent);
        rawDiscount = Number.isNaN(parsed) ? null : parsed;
      }

      const displayDiscount = getDisplayDiscountPercent({
        discount_percent: rawDiscount,
        seller_feedback_count: sellerFeedbackCount,
        seller_positive_percent: sellerPositivePercent,
      });

      // Filter out deals that don't meet minimum discount
      if (displayDiscount == null || displayDiscount > -MIN_DISCOUNT) {
        return null;
      }

      // Compute confidence weight if not in DB
      let confidenceWeight: number | null = null;
      if (row.deal_confidence_weight != null) {
        confidenceWeight = Number(row.deal_confidence_weight);
      } else if (
        sampleSize != null &&
        row.median_price_cad != null &&
        row.std_dev_cad != null &&
        row.shipping_cad != null
      ) {
        confidenceWeight = computeDealConfidenceWeight({
          sampleCount: sampleSize,
          medianPrice: Number(row.median_price_cad),
          stdDev: Number(row.std_dev_cad),
          shippingPrice: Number(row.shipping_cad),
        });
      }

      const mappedDeal: Deal = {
        id: row.listing_id,
        title: row.title,
        url: row.url,
        priceCad: total
          ? total - (row.shipping_cad ? Number(row.shipping_cad) : 0)
          : null,
        shippingCad: row.shipping_cad ? Number(row.shipping_cad) : null,
        totalPriceCad: total,
        totalUsd,
        historicPriceCad: historic,
        // Native currency fields
        currency: row.currency ?? null,
        priceNative: row.price_native ? Number(row.price_native) : null,
        shippingNative: row.shipping_native
          ? Number(row.shipping_native)
          : null,
        totalNative: row.total_native ? Number(row.total_native) : null,
        discountPercent: displayDiscount,
        sampleSize,
        confidenceWeight,
        market: row.market,
        endsAt: row.ends_at,
        updatedAt: row.updated_at,
        thumbnailUrl: row.thumbnail_url,
        sellerUsername: row.seller_username,
        sellerStoreName: normalizeSellerStoreName(row.seller_store_name),
        sellerFeedbackCount,
        sellerPositivePercent,
        card: row.card_id
          ? {
              id: row.card_id,
              name: row.card_name,
              setName: row.set_name,
              cardNumber: null,
              conditionBucket: row.condition_bucket,
            }
          : null,
        condition: row.condition_bucket,
        setName: row.set_name,
        cardName: row.card_name,
        cardId: row.card_id,
        integrityStatus: (row.integrity_status ?? "OK") as "OK" | "REVIEW",
        integrityReason: row.integrity_reason ?? null,
        integrityScore:
          row.integrity_score != null ? Number(row.integrity_score) : null,
      };
      return mappedDeal;
    })
    .filter((deal: Deal | null): deal is Deal => deal !== null);

  // Safety net: filter out any blacklisted/excluded items that slipped through ingestion
  const filteredDeals: Deal[] = [];
  for (const deal of deals) {
    const result = await shouldExcludeListingFromCardSurfaces(
      { title: deal.title ?? "", listingId: String(deal.id) }, // listingId must be stable for overrides/backfill (use DB listing id)
      deal.card
        ? {
            name: deal.card.name,
            setName: deal.card.setName,
            number: deal.card.cardNumber,
            rarity: null, // rarity not yet in cards table
          }
        : undefined
    );
    if (result.excluded) {
      continue;
    }
    if (deal.integrityStatus === "REVIEW" && result.overrideType !== "ALLOW") {
      continue;
    }
    filteredDeals.push(deal);
  }
  warnIfStoreNamesMissing(filteredDeals, "topDeals");

  const sellerUsernames = Array.from(
    new Set(
      filteredDeals
        .map((deal) => deal.sellerUsername)
        .filter((seller): seller is string => Boolean(seller))
    )
  );
  const sellerSeenCounts = await fetchSellerSeenCounts(
    sellerUsernames,
    market,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn
  );
  if (sellerSeenCounts.size > 0) {
    for (const deal of filteredDeals) {
      const seller = deal.sellerUsername ?? null;
      if (!seller) continue;
      const count = sellerSeenCounts.get(seller);
      if (count == null) continue;
      deal.sellerSeenDealCount = count;
      deal.sellerSeenWindowDays = SELLER_SEEN_WINDOW_DAYS;
      deal.sellerSeenMarket = market;
    }
  }

  // Fetch stock images for all deals
  const cardsForImages = filteredDeals
    .filter((d) => d.cardId && d.cardName && d.setName)
    .map((d) => ({
      cardId: d.cardId!,
      name: d.cardName,
      setName: d.setName,
      cardNumber: d.card?.cardNumber ?? null,
    }));

  const stockImages = await getCardStockImageUrls(cardsForImages);

  // Attach stock images to deals
  for (const deal of filteredDeals) {
    if (deal.cardId) {
      const stockImage = stockImages.get(deal.cardId);
      if (stockImage) {
        deal.stockImageUrl = stockImage.url;
      }
    }
  }

  return filteredDeals;
}

async function fetchSellerSeenCounts(
  sellerUsernames: string[],
  market: string,
  hasListingsMarketColumn: boolean,
  hasHistoricalMarketColumn: boolean
): Promise<Map<string, number>> {
  if (sellerUsernames.length === 0) {
    return new Map();
  }
  const historicalMarket = market === "all" ? DEFAULT_MARKET : market;
  const marketLiteral = `'${historicalMarket}'::text`;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn && market !== "all"
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const params: (string | number | string[])[] = [
    sellerUsernames,
    MIN_SAMPLE_SIZE,
    MIN_SELLER_FEEDBACK_COUNT,
    MIN_SELLER_POSITIVE_PERCENT,
  ];
  const marketParamIndex = params.length + 1;
  const marketFilterClause =
    hasListingsMarketColumn && market !== "all"
      ? `AND l.market = $${marketParamIndex}`
      : "";
  if (hasListingsMarketColumn && market !== "all") {
    params.push(market);
  }

  const res = await query<SellerSeenCountRow>(
    `
      SELECT
        l.seller_username,
        COUNT(*)::bigint AS deal_count
      FROM listings l
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE
        l.seller_username = ANY($1)
        AND l.updated_at >= NOW() - INTERVAL '${SELLER_SEEN_WINDOW_DAYS} days'
        AND l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND hp.sample_size IS NOT NULL
        AND hp.sample_size >= $2
        AND l.seller_feedback_count IS NOT NULL
        AND l.seller_feedback_count >= $3
        AND l.seller_positive_percent IS NOT NULL
        AND l.seller_positive_percent >= $4
        AND l.seller_username IS NOT NULL
        AND l.shipping_known = TRUE
        AND (
          l.match_eligible = TRUE
          OR (
            l.match_eligible = FALSE
            AND l.match_reject_reason IN (
              'language_mismatch',
              'collector_number_mismatch'
            )
            AND EXISTS (
              SELECT 1
              FROM listing_overrides lo
              WHERE lo.listing_id = l.listing_id
                AND lo.override_type = 'ALLOW'
                AND lo.reason IN (
                  'manual_allow:language_mismatch',
                  'manual_allow:collector_number_mismatch'
                )
            )
          )
        )
        ${marketFilterClause}
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      GROUP BY l.seller_username;
    `,
    params
  );

  const counts = new Map<string, number>();
  for (const row of res.rows) {
    if (!row.seller_username) continue;
    counts.set(row.seller_username, Number(row.deal_count ?? 0));
  }
  return counts;
}

export default async function TopDealsPage() {
  const isAdmin = Boolean(process.env.ADMIN_SECRET) && isAdminAuthenticated();

  const deals = await getTopDeals();

  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-4">
        <div className="space-y-2">
          <h1 className={PAGE_TITLE}>Top Deals</h1>
          <p className={PAGE_SUBTITLE}>
            High-confidence listings with strong discounts versus recent
            medians.
          </p>
        </div>

        <div className={TABLE_CONTAINER}>
          <TopDealsClient deals={deals} isAdmin={isAdmin} />
          <p className="mt-4 text-xs text-slate-400 text-right">
            {TCGPLAYER_ATTRIBUTION}
          </p>
        </div>
      </div>
    </main>
  );
}

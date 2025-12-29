export const dynamic = "force-dynamic";

import EndingSoonClient from "../../components/EndingSoonClient";
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
import { convertCad } from "../../lib/money";
import { cookies, headers } from "next/headers";

import { DEFAULT_MARKET } from "../../lib/markets";
import {
  MARKET_COOKIE_NAME,
  getGeoCountryFromHeaders,
  resolveMarketPreference,
} from "../../lib/marketPreference";
import {
  USD_BASELINE_COOKIE_NAME,
  parseUsdBaselineCookie,
} from "../../lib/usdBaselinePreference";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
  ensureListingsIntegrityColumns,
  LISTINGS_INTEGRITY_MISSING_MESSAGE,
} from "../../lib/schema";
import { shouldExcludeListingFromCardSurfaces } from "../../lib/blacklist";
import {
  warnIfStoreNamesMissing,
  normalizeSellerStoreName,
} from "../../lib/sellerDisplay";
import { isAdminAuthenticated } from "../../lib/adminAuth";

const MIN_SAMPLE_SIZE = 20;
const TRUSTED_FEEDBACK = 20;
const TRUSTED_POSITIVE_PERCENT = 98;
const SELLER_SEEN_WINDOW_DAYS = 30;

type EndingSoonRow = {
  listing_id: number;
  card_id: number | null;
  card_name: string | null;
  set_name: string | null;
  title: string | null;
  condition: string | null;
  total_price_cad: string | null;
  total_usd: string | null;
  historic_price_cad: string | null;
  shipping_cad: string | null;
  sample_size: number | null;
  discount_percent: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  market: string;
  ends_at: string | null;
  updated_at: string | null;
  listing_url: string;
  seller_username: string | null;
  seller_store_name: string | null;
  thumbnail_url: string | null;
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

async function getEndingSoonDeals(): Promise<Deal[]> {
  const hasIntegrityColumns = await ensureListingsIntegrityColumns();
  if (!hasIntegrityColumns) {
    throw new Error(LISTINGS_INTEGRITY_MISSING_MESSAGE);
  }
  const cookieMarket = cookies().get(MARKET_COOKIE_NAME)?.value ?? null;
  const geoCountry = getGeoCountryFromHeaders(headers());
  const market = resolveMarketPreference(cookieMarket, geoCountry);
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const historicalMarket = market === "all" ? DEFAULT_MARKET : market;
  const marketLiteral = `'${historicalMarket}'::text`;
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const marketFilterClause =
    hasListingsMarketColumn && market !== "all" ? "AND l.market = $4" : "";

  const res = await query<EndingSoonRow>(
    `
      SELECT
        l.id AS listing_id,
        l.title,
        l.card_id,
        c.name AS card_name,
        c.set_name,
        c.condition_bucket AS condition,
        l.total_price_cad,
        l.total_usd,
        l.historic_price_cad,
        l.shipping_cad,
        hp.sample_size,
        l.discount_percent,
        l.seller_feedback_count,
        l.seller_positive_percent,
        ${marketSelect} AS market,
        l.ends_at,
        l.updated_at,
        l.url AS listing_url,
        l.seller_username,
        l.seller_store_name,
        l.thumbnail_url,
        l.currency,
        l.price_native,
        l.shipping_native,
        l.total_native
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE
        l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
        AND hp.sample_size IS NOT NULL
        AND hp.sample_size >= $1
        AND l.seller_feedback_count IS NOT NULL
        AND l.seller_feedback_count >= $2
        AND l.seller_positive_percent IS NOT NULL
        AND l.seller_positive_percent >= $3
        AND l.ends_at IS NOT NULL
        AND l.ends_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
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
        l.ends_at ASC,
        l.discount_percent ASC NULLS LAST
      LIMIT 100;
    `,
    [
      MIN_SAMPLE_SIZE,
      TRUSTED_FEEDBACK,
      TRUSTED_POSITIVE_PERCENT,
      ...(hasListingsMarketColumn && market !== "all" ? [market] : []),
    ]
  );

  const deals = res.rows.map((row: EndingSoonRow): Deal => {
    const total =
      row.total_price_cad !== null ? Number(row.total_price_cad) : null;
    const totalUsd = row.total_usd !== null ? Number(row.total_usd) : null;
    const historic =
      row.historic_price_cad !== null ? Number(row.historic_price_cad) : null;
    const historicPriceUsd =
      historic != null ? convertCad(historic, "USD") : null;
    const shippingCad =
      row.shipping_cad !== null ? Number(row.shipping_cad) : null;
    const sampleSize =
      row.sample_size !== null ? Number(row.sample_size) : null;
    const sellerFeedbackCount =
      row.seller_feedback_count !== null
        ? Number(row.seller_feedback_count)
        : null;
    const sellerPositivePercent =
      row.seller_positive_percent !== null
        ? Number(row.seller_positive_percent)
        : null;

    let rawDiscount = computeDiscountPercent(total, historic);
    if (rawDiscount == null && row.discount_percent !== null) {
      const parsed = Number(row.discount_percent);
      rawDiscount = Number.isNaN(parsed) ? null : parsed;
    }

    const displayDiscount =
      sampleSize !== null && sampleSize < 5
        ? null
        : getDisplayDiscountPercent({
            discount_percent: rawDiscount,
            seller_feedback_count: sellerFeedbackCount,
            seller_positive_percent: sellerPositivePercent,
          });

    return {
      id: row.listing_id,
      title: row.title ?? "Unknown listing",
      url: row.listing_url,
      priceCad: null,
      shippingCad,
      totalPriceCad: total,
      totalUsd,
      historicPriceCad: historic,
      historicPriceUsd,
      discountPercent: displayDiscount,
      sampleSize,
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
            conditionBucket: row.condition,
          }
        : null,
      condition: row.condition,
      setName: row.set_name,
      cardName: row.card_name,
      cardId: row.card_id,
      // Native currency fields
      currency: row.currency ?? null,
      priceNative: row.price_native != null ? Number(row.price_native) : null,
      shippingNative:
        row.shipping_native != null ? Number(row.shipping_native) : null,
      totalNative: row.total_native != null ? Number(row.total_native) : null,
    };
  });

  // Safety net: filter out any blacklisted/excluded items that slipped through ingestion
  const filtered: Deal[] = [];
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
    if (!result.excluded) {
      filtered.push(deal);
    }
  }

  const sellerUsernames = Array.from(
    new Set(
      filtered
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
    for (const deal of filtered) {
      const seller = deal.sellerUsername ?? null;
      if (!seller) continue;
      const count = sellerSeenCounts.get(seller);
      if (count == null) continue;
      deal.sellerSeenDealCount = count;
      deal.sellerSeenWindowDays = SELLER_SEEN_WINDOW_DAYS;
      deal.sellerSeenMarket = market;
    }
  }

  warnIfStoreNamesMissing(filtered, "endingSoon");
  return filtered;
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
      : hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const params: (string | number | string[])[] = [
    sellerUsernames,
    MIN_SAMPLE_SIZE,
    TRUSTED_FEEDBACK,
    TRUSTED_POSITIVE_PERCENT,
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
        AND l.seller_username IS NOT NULL
        AND hp.sample_size IS NOT NULL
        AND hp.sample_size >= $2
        AND l.seller_feedback_count IS NOT NULL
        AND l.seller_feedback_count >= $3
        AND l.seller_positive_percent IS NOT NULL
        AND l.seller_positive_percent >= $4
        AND l.ends_at IS NOT NULL
        AND l.ends_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
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

export default async function EndingSoonPage() {
  const isAdmin = Boolean(process.env.ADMIN_SECRET) && isAdminAuthenticated();

  const deals = await getEndingSoonDeals();
  const showUsdBaseline = parseUsdBaselineCookie(
    cookies().get(USD_BASELINE_COOKIE_NAME)?.value
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pb-14 space-y-4">
        <div className="space-y-2">
          <h1 className={PAGE_TITLE}>Ending Soon</h1>
          <p className={PAGE_SUBTITLE}>
            Trusted discounted listings ending in the next 24 hours.
          </p>
        </div>

        <div className={`${TABLE_CONTAINER} overflow-x-auto`}>
          <EndingSoonClient
            deals={deals}
            isAdmin={isAdmin}
            initialShowUsdBaseline={showUsdBaseline}
          />
        </div>
      </div>
    </main>
  );
}

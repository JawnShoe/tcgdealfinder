import Link from "next/link";
import { notFound } from "next/navigation";

import DealsTable from "../../../components/DealsTable";
import { WatchlistStarButton } from "../../../components/WatchlistStarButton";
import type { Deal } from "../../../types/deal";
import { query } from "../../../lib/db";
import { formatCurrency } from "../../../lib/dealFormatting";
import { convertCad } from "../../../lib/money";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../../lib/pricing";
import { cookies, headers } from "next/headers";
import { ANON_ID_COOKIE, isValidAnonId } from "../../../lib/anonId";
import { fetchWatchedCardIdSet } from "../../../lib/watchlistDb";

import { DEFAULT_MARKET, type MarketCode } from "../../../lib/markets";
import {
  MARKET_COOKIE_NAME,
  getGeoCountryFromHeaders,
  resolveMarketPreference,
  type MarketPreference,
} from "../../../lib/marketPreference";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../../../lib/schema";
import {
  warnIfStoreNamesMissing,
  normalizeSellerStoreName,
} from "../../../lib/sellerDisplay";

const HOT_CARD_LIMIT = 8;
const HOT_CARD_THRESHOLD = -5;
const DEAL_LIMIT = 400;
const SELLER_SEEN_WINDOW_DAYS = 30;

type MarketContext = {
  market: MarketPreference;
  hasListingsMarketColumn: boolean;
  hasHistoricalMarketColumn: boolean;
};

type SetOverviewStats = {
  totalCardsTracked: number;
  cardCountWithDeals: number;
  activeListingsCount: number;
  avgDiscountPercent: number | null;
  bestDiscountPercent: number | null;
};

type SetMetadata = {
  id: number | null;
  name: string;
  series: string | null;
  releaseDate: string | null;
  totalCards: number | null;
  symbolUrl: string | null;
  logoUrl: string | null;
};

type CatalogCard = {
  id: number;
  name: string;
  number: string | null;
  rarity: string | null;
  supertype: string | null;
};

type HotCard = {
  id: number;
  name: string;
  cardNumber: string | null;
  condition: string | null;
  medianPriceCad: number | null;
  bestDealTotalPriceCad: number | null;
  bestDealDiscountPercent: number | null;
  bestDealUrl: string | null;
};

type HotCardRowData = {
  id: number;
  name: string;
  card_number: string | null;
  condition_bucket: string | null;
  median_price_cad: string | null;
  deal_total_price_cad: string | null;
  deal_discount_percent: string | null;
  deal_url: string | null;
  deal_seller_feedback_count: number | null;
  deal_seller_positive_percent: number | null;
};

type DealRow = {
  id: number;
  title: string;
  url: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  total_usd: string | null;
  historic_price_cad: string | null;
  discount_percent: string | null;
  market: string;
  ends_at: string | null;
  updated_at: string | null;
  thumbnail_url: string | null;
  sample_size: number | null;
  seller_username: string | null;
  seller_store_name: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  card_id: number | null;
  card_name: string | null;
  card_set_name: string | null;
  card_number: string | null;
  card_condition_bucket: string | null;
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

function decodeSetName(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

async function ensureSetExists(setName: string): Promise<boolean> {
  const res = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM cards
        WHERE set_name = $1
      ) AS exists;
    `,
    [setName]
  );
  return Boolean(res.rows[0]?.exists);
}

async function getSetMetadata(setName: string): Promise<SetMetadata | null> {
  const res = await query<{
    id: number;
    name: string;
    pokemontcg_series: string | null;
    release_date: string | null;
    pokemontcg_total_cards: number | null;
    symbol_url: string | null;
    logo_url: string | null;
  }>(
    `
      SELECT
        id,
        name,
        pokemontcg_series,
        release_date,
        pokemontcg_total_cards,
        symbol_url,
        logo_url
      FROM catalog_sets
      WHERE name = $1
      LIMIT 1;
    `,
    [setName]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    series: row.pokemontcg_series,
    releaseDate: row.release_date,
    totalCards: row.pokemontcg_total_cards,
    symbolUrl: row.symbol_url,
    logoUrl: row.logo_url,
  };
}

async function getSetOverview(
  setName: string,
  context: MarketContext
): Promise<SetOverviewStats> {
  const totalsRes = await query<{ count: string }>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM cards
      WHERE set_name = $1;
    `,
    [setName]
  );
  const listingsRes = await query<{
    card_count: string | null;
    listing_count: string | null;
    avg_discount: string | null;
    best_discount: string | null;
  }>(
    `
      SELECT
        COUNT(DISTINCT l.card_id)::bigint AS card_count,
        COUNT(*)::bigint AS listing_count,
        AVG(l.discount_percent)::numeric AS avg_discount,
        MIN(l.discount_percent)::numeric AS best_discount
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      WHERE c.set_name = $1
        AND l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
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
        AND l.shipping_known = TRUE
        ${context.hasListingsMarketColumn && context.market !== "all" ? "AND l.market = $2" : ""}
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        );
    `,
    context.hasListingsMarketColumn && context.market !== "all"
      ? [setName, context.market]
      : [setName]
  );

  const listingRow = listingsRes.rows[0];
  return {
    totalCardsTracked: Number(totalsRes.rows[0]?.count ?? 0),
    cardCountWithDeals: Number(listingRow?.card_count ?? 0),
    activeListingsCount: Number(listingRow?.listing_count ?? 0),
    avgDiscountPercent:
      listingRow?.avg_discount != null ? Number(listingRow.avg_discount) : null,
    bestDiscountPercent:
      listingRow?.best_discount != null
        ? Number(listingRow.best_discount)
        : null,
  };
}

async function getHotCards(
  setName: string,
  context: MarketContext
): Promise<HotCard[]> {
  const params: (string | number)[] = [
    setName,
    HOT_CARD_THRESHOLD,
    HOT_CARD_LIMIT,
  ];
  const marketFilterClause =
    context.hasListingsMarketColumn && context.market !== "all"
      ? "AND l.market = $4"
      : "";
  if (context.hasListingsMarketColumn && context.market !== "all") {
    params.push(context.market);
  }
  const historicalMarketClause =
    context.hasHistoricalMarketColumn && context.market !== "all"
      ? `AND hp.market = '${context.market}'`
      : "";
  const res = await query<{
    id: number;
    name: string;
    card_number: string | null;
    condition_bucket: string | null;
    median_price_cad: string | null;
    deal_total_price_cad: string | null;
    deal_discount_percent: string | null;
    deal_url: string | null;
    deal_seller_feedback_count: number | null;
    deal_seller_positive_percent: string | null;
  }>(
    `
      SELECT
        c.id,
        c.name,
        c.card_number,
        c.condition_bucket,
        hp.median_price_cad,
        best.deal_total_price_cad,
        best.deal_discount_percent,
        best.deal_url,
        best.deal_seller_feedback_count,
        best.deal_seller_positive_percent
      FROM cards c
      LEFT JOIN historical_prices hp ON hp.card_id = c.id
        ${historicalMarketClause}
      LEFT JOIN LATERAL (
        SELECT
          l.total_price_cad AS deal_total_price_cad,
          l.discount_percent AS deal_discount_percent,
          l.url AS deal_url,
          l.seller_feedback_count AS deal_seller_feedback_count,
          l.seller_positive_percent AS deal_seller_positive_percent
        FROM listings l
        WHERE l.card_id = c.id
          AND l.total_price_cad IS NOT NULL
          AND l.historic_price_cad IS NOT NULL
          AND l.discount_percent IS NOT NULL
          AND l.discount_percent <= $2
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
          l.discount_percent ASC,
          l.total_price_cad ASC
        LIMIT 1
      ) best ON TRUE
      WHERE c.set_name = $1
      AND best.deal_discount_percent IS NOT NULL
      ORDER BY best.deal_discount_percent ASC
      LIMIT $3;
    `,
    params
  );

  const deals = res.rows.map((row) => {
    const median =
      row.median_price_cad != null ? Number(row.median_price_cad) : null;
    const bestPrice =
      row.deal_total_price_cad != null
        ? Number(row.deal_total_price_cad)
        : null;
    const sellerFeedback =
      row.deal_seller_feedback_count != null
        ? Number(row.deal_seller_feedback_count)
        : null;
    const sellerPositive =
      row.deal_seller_positive_percent != null
        ? Number(row.deal_seller_positive_percent)
        : null;

    let rawDiscount = computeDiscountPercent(bestPrice, median);
    if (rawDiscount == null && row.deal_discount_percent != null) {
      const parsed = Number(row.deal_discount_percent);
      rawDiscount = Number.isNaN(parsed) ? null : parsed;
    }
    const displayDiscount = getDisplayDiscountPercent({
      discount_percent: rawDiscount,
      seller_feedback_count: sellerFeedback,
      seller_positive_percent: sellerPositive,
    });

    return {
      id: row.id,
      name: row.name,
      cardNumber: row.card_number,
      condition: row.condition_bucket,
      medianPriceCad: median,
      bestDealTotalPriceCad: bestPrice,
      bestDealDiscountPercent: displayDiscount,
      bestDealUrl: row.deal_url,
    };
  });
  return deals;
}

async function getSetDeals(
  setName: string,
  context: MarketContext
): Promise<Deal[]> {
  const historicalMarket =
    context.market === "all" ? DEFAULT_MARKET : context.market;
  const marketLiteral = `'${historicalMarket}'::text`;
  const marketSelect = context.hasListingsMarketColumn
    ? "l.market"
    : marketLiteral;
  const marketFilterClause =
    context.hasListingsMarketColumn && context.market !== "all"
      ? "AND l.market = $3"
      : "";
  const historicalJoinClause =
    context.hasHistoricalMarketColumn && context.hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : context.hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const params: (string | number)[] = [setName, DEAL_LIMIT];
  if (context.hasListingsMarketColumn && context.market !== "all") {
    params.push(context.market);
  }
  const res = await query<DealRow>(
    `
      SELECT
        l.id,
        l.title,
        l.url,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        l.total_usd,
        l.historic_price_cad,
        l.discount_percent,
        ${marketSelect} AS market,
        l.ends_at,
        l.updated_at,
        l.thumbnail_url,
        l.seller_username,
        l.seller_store_name,
        l.seller_feedback_count,
        l.seller_positive_percent,
        hp.sample_size,
        c.id   AS card_id,
        c.name AS card_name,
        c.set_name AS card_set_name,
        c.card_number AS card_number,
        c.condition_bucket AS card_condition_bucket,
        l.currency,
        l.price_native,
        l.shipping_native,
        l.total_native
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE c.set_name = $1
        AND l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
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
      LIMIT $2;
    `,
    params
  );

  const deals: Deal[] = res.rows.map((row) => {
    const priceCad = row.price_cad != null ? Number(row.price_cad) : null;
    const shippingCad =
      row.shipping_cad != null ? Number(row.shipping_cad) : null;
    const totalPriceCad =
      row.total_price_cad != null ? Number(row.total_price_cad) : null;
    const totalUsd = row.total_usd != null ? Number(row.total_usd) : null;
    const historicPriceCad =
      row.historic_price_cad != null ? Number(row.historic_price_cad) : null;
    const historicPriceUsd =
      historicPriceCad != null ? convertCad(historicPriceCad, "USD") : null;
    const sampleSize = row.sample_size != null ? Number(row.sample_size) : null;
    const sellerFeedbackCount =
      row.seller_feedback_count != null
        ? Number(row.seller_feedback_count)
        : null;
    const sellerPositivePercent =
      row.seller_positive_percent != null
        ? Number(row.seller_positive_percent)
        : null;

    const storedDiscount =
      row.discount_percent != null ? Number(row.discount_percent) : null;
    let rawDiscount = computeDiscountPercent(
      totalPriceCad ?? priceCad,
      historicPriceCad
    );
    if (rawDiscount == null && storedDiscount != null) {
      rawDiscount = Number.isNaN(storedDiscount) ? null : storedDiscount;
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
      id: row.id,
      title: row.title,
      url: row.url,
      priceCad,
      shippingCad,
      totalPriceCad,
      totalUsd,
      historicPriceCad,
      historicPriceUsd,
      discountPercent: displayDiscount,
      sampleSize,
      market: row.market,
      endsAt: row.ends_at,
      updatedAt: row.updated_at,
      thumbnailUrl: row.thumbnail_url,
      sellerUsername: row.seller_username,
      sellerFeedbackCount,
      sellerPositivePercent,
      sellerStoreName: normalizeSellerStoreName(row.seller_store_name),
      card: row.card_id
        ? {
            id: row.card_id,
            name: row.card_name,
            setName: row.card_set_name,
            cardNumber: row.card_number,
            conditionBucket: row.card_condition_bucket,
          }
        : null,
      condition: row.card_condition_bucket,
      setName: row.card_set_name,
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

  const sellerUsernames = Array.from(
    new Set(
      deals
        .map((deal) => deal.sellerUsername)
        .filter((seller): seller is string => Boolean(seller))
    )
  );
  const sellerSeenCounts = await fetchSellerSeenCountsForSet(
    sellerUsernames,
    setName,
    context
  );
  if (sellerSeenCounts.size > 0) {
    for (const deal of deals) {
      const seller = deal.sellerUsername ?? null;
      if (!seller) continue;
      const count = sellerSeenCounts.get(seller);
      if (count == null) continue;
      deal.sellerSeenDealCount = count;
      deal.sellerSeenWindowDays = SELLER_SEEN_WINDOW_DAYS;
      deal.sellerSeenMarket = context.market;
    }
  }

  return deals;
}

async function fetchSellerSeenCountsForSet(
  sellerUsernames: string[],
  setName: string,
  context: MarketContext
): Promise<Map<string, number>> {
  if (sellerUsernames.length === 0) {
    return new Map();
  }
  const params: (string | string[])[] = [sellerUsernames, setName];
  const marketParamIndex = params.length + 1;
  const marketFilterClause =
    context.hasListingsMarketColumn && context.market !== "all"
      ? `AND l.market = $${marketParamIndex}`
      : "";
  if (context.hasListingsMarketColumn && context.market !== "all") {
    params.push(context.market);
  }

  const res = await query<SellerSeenCountRow>(
    `
      SELECT
        l.seller_username,
        COUNT(*)::bigint AS deal_count
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      WHERE
        l.seller_username = ANY($1)
        AND c.set_name = $2
        AND l.updated_at >= NOW() - INTERVAL '${SELLER_SEEN_WINDOW_DAYS} days'
        AND l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
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

function formatDiscount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function discountBadgeClass(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "discount-neutral";
  if (value <= -15) return "discount-good";
  if (value >= 5) return "discount-bad";
  return "discount-neutral";
}

function formatDate(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
}

export default async function SetDetailPage({
  params,
}: {
  params: { setId: string };
}) {
  const setName = decodeSetName(params.setId);
  const metadata = await getSetMetadata(setName);
  if (!metadata) {
    const exists = await ensureSetExists(setName);
    if (!exists) {
      notFound();
    }
  }

  const cookieMarket = cookies().get(MARKET_COOKIE_NAME)?.value ?? null;
  const geoCountry = getGeoCountryFromHeaders(headers());
  const market = resolveMarketPreference(cookieMarket, geoCountry);
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const marketContext: MarketContext = {
    market,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn,
  };

  const catalogCardsPromise = metadata?.id
    ? getCatalogCards(metadata.id)
    : Promise.resolve<CatalogCard[]>([]);

  const [stats, hotCards, deals, catalogCards] = await Promise.all([
    getSetOverview(setName, marketContext),
    getHotCards(setName, marketContext),
    getSetDeals(setName, marketContext),
    catalogCardsPromise,
  ]);
  const ownerIdRaw = cookies().get(ANON_ID_COOKIE)?.value ?? null;
  const ownerId = isValidAnonId(ownerIdRaw) ? ownerIdRaw : null;
  const watchedIds = ownerId
    ? await fetchWatchedCardIdSet(ownerId, [
        ...deals.map((deal) => deal.cardId ?? 0),
        ...hotCards.map((card) => card.id),
      ])
    : new Set<number>();

  if (watchedIds.size > 0) {
    for (const deal of deals) {
      const cardId = deal.cardId ?? null;
      if (cardId == null) continue;
      deal.isWatched = watchedIds.has(cardId);
    }
  }

  const displayName = metadata?.name ?? setName;
  const releaseLabel = formatDate(metadata?.releaseDate ?? null) ?? "Unknown";
  const seriesLabel = metadata?.series ?? "Pokémon";
  const totalCardsLabel =
    metadata?.totalCards ?? (stats.totalCardsTracked || null);
  const catalogCardCount = catalogCards.length;
  const coveragePercent =
    totalCardsLabel && totalCardsLabel > 0
      ? Math.round((catalogCardCount / totalCardsLabel) * 100)
      : null;
  const catalogCoverageLabel = totalCardsLabel
    ? `${catalogCardCount} / ${totalCardsLabel}${
        coveragePercent != null ? ` (${coveragePercent}%)` : ""
      }`
    : `${catalogCardCount}`;

  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-8 pb-8">
        <header className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <Link
                href="/sets"
                className="text-sm text-slate-500 transition hover:text-slate-700"
              >
                Back to sets
              </Link>
              <div className="flex items-start gap-4">
                {renderSetIconFromMetadata(metadata)}
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Pokémon set
                  </p>
                  <h1 className="text-3xl font-bold text-slate-900">
                    {displayName}
                  </h1>
                  <p className="text-base text-slate-600">
                    Part of {seriesLabel}. Released {releaseLabel}.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="#deals"
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Jump to deals
              </Link>
              <a
                href="#catalog-cards"
                className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50"
              >
                Jump to catalog cards
              </a>
            </div>
          </div>
          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Series
              </p>
              <p className="text-base font-semibold text-slate-900">
                {seriesLabel}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Release date
              </p>
              <p className="text-base font-semibold text-slate-900">
                {releaseLabel}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total cards
              </p>
              <p className="text-base font-semibold text-slate-900">
                {totalCardsLabel ?? "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Catalog coverage
              </p>
              <p className="text-base font-semibold text-slate-900">
                {catalogCoverageLabel}
              </p>
            </div>
          </div>
          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Cards with deals
              </p>
              <p className="text-base font-semibold text-slate-900">
                {stats.cardCountWithDeals}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Active listings
              </p>
              <p className="text-base font-semibold text-slate-900">
                {stats.activeListingsCount}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Avg discount
              </p>
              <p className="text-base font-semibold text-slate-900">
                {formatDiscount(stats.avgDiscountPercent)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Best discount
              </p>
              <p className="text-base font-semibold text-slate-900">
                {formatDiscount(stats.bestDiscountPercent)}
              </p>
            </div>
          </div>
        </header>

        <section className="panel space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Hot cards in this set
            </h2>
            <p className="text-xs text-slate-500">
              Showing cards with at least {Math.abs(HOT_CARD_THRESHOLD)}% off
            </p>
          </div>
          {hotCards.length === 0 ? (
            <p className="text-sm text-slate-500">
              No deals below recent median right now. Check back soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hotCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      <Link
                        href={`/cards/${card.id}`}
                        className="transition hover:text-slate-600"
                      >
                        {card.name}
                      </Link>
                    </div>
                    <WatchlistStarButton
                      cardId={card.id}
                      cardName={card.name}
                      setName={setName}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    #{card.cardNumber ?? "—"} • {card.condition ?? "Unknown"}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between text-sm">
                    <span className="text-slate-500">Best price</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(card.bestDealTotalPriceCad)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-sm">
                    <span className="text-slate-500">Discount</span>
                    <span
                      className={discountBadgeClass(
                        card.bestDealDiscountPercent
                      )}
                    >
                      {formatDiscount(card.bestDealDiscountPercent)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs text-slate-500">
                    <span>Median:</span>
                    <span>{formatCurrency(card.medianPriceCad)}</span>
                  </div>
                  <div className="mt-3">
                    <a
                      href={card.bestDealUrl ?? `/cards/${card.id}`}
                      target={card.bestDealUrl ? "_blank" : "_self"}
                      rel={card.bestDealUrl ? "noreferrer" : undefined}
                      className="inline-flex w-full justify-center rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View listing
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="deals" className="panel space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Live deals</h2>
            <p className="text-xs text-slate-500">
              Sorted by best discount with trust filters applied
            </p>
          </div>
          {deals.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No active listings for this set right now.
            </div>
          ) : (
            <DealsTable deals={deals} page={1} totalPages={1} />
          )}
        </section>

        <section id="catalog-cards" className="space-y-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Catalog cards
              </h2>
              <p className="text-sm text-slate-500">
                {catalogCardCount > 0
                  ? `${catalogCardCount} cards imported for this set`
                  : "Card data for this set is loading. Check back shortly."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/sets"
                className="inline-flex items-center rounded border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-white"
              >
                Back to sets
              </Link>
              <a
                href="#deals"
                className="inline-flex items-center rounded border border-slate-200 px-3 py-1.5 text-slate-500 transition hover:bg-white"
              >
                View live deals
              </a>
            </div>
          </div>
          {catalogCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700">No catalog cards yet</p>
              <p className="mt-1">
                We have the set, but card-level catalog data hasn&apos;t been
                imported for it yet.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href="/sets"
                  className="inline-flex items-center rounded border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-white"
                >
                  Back to sets
                </Link>
                <a
                  href="#deals"
                  className="inline-flex items-center rounded border border-slate-200 px-4 py-2 text-slate-500 hover:bg-white"
                >
                  View live deals
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Card</th>
                      <th className="px-4 py-3">Rarity</th>
                      <th className="px-4 py-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogCards.map((card, index) => (
                      <tr
                        key={card.id}
                        className={
                          index === 0 ? "" : "border-t border-slate-100"
                        }
                      >
                        <td className="px-4 py-3 text-slate-500">
                          {card.number ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {card.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {card.rarity ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {card.supertype ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function renderSetIconFromMetadata(
  set: SetMetadata | null
): JSX.Element | null {
  const src = set?.symbolUrl ?? set?.logoUrl;
  if (!src) return null;
  return (
    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={set?.name ? `${set.name} logo` : "Set logo"}
        className="h-8 w-8 object-contain"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

async function getCatalogCards(catalogSetId: number): Promise<CatalogCard[]> {
  const res = await query<{
    id: number;
    name: string;
    number: string | null;
    rarity: string | null;
    supertype: string | null;
  }>(
    `
      SELECT
        id,
        name,
        number,
        rarity,
        supertype
      FROM catalog_cards
      WHERE catalog_set_id = $1
      ORDER BY
        COALESCE(NULLIF(number, ''), 'ZZZ') ASC,
        name ASC;
    `,
    [catalogSetId]
  );

  return res.rows;
}

import { query } from "@/lib/db";
import {
  ensureDealConfidenceColumn,
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "@/lib/schema";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "@/lib/pricing";
import type { Deal } from "@/types/deal";
import { computeDealConfidenceWeight } from "@/lib/dealConfidence";
import type {
  DealsApiMeta,
  DealsApiResponse,
  DealsApiSort,
} from "@/types/dealsApi";
import {
  DEFAULT_MARKET,
  type MarketCode,
  normalizeMarketCode,
} from "@/lib/markets";
import { shouldExcludeListingFromCardSurfaces } from "@/lib/blacklist";

type DealRow = {
  id: number;
  listing_id: string | null;
  title: string;
  url: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  historic_price_cad: string | null;
  discount_percent: string | null;
  calculated_discount: string | null;
  market: string;
  ends_at: string | null;
  updated_at: string | null;
  thumbnail_url: string | null;
  sample_size: number | null;
  seller_username: string | null;
  seller_store_name: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: number | null;
  card_id: number | null;
  card_name: string | null;
  card_set_name: string | null;
  card_number: string | null;
  card_condition_bucket: string | null;
  deal_confidence_weight: string | null;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type SortConfig = {
  requireHistoric: boolean;
  requireEndsAt?: boolean;
};

const SORT_CONFIG: Record<DealsApiSort, SortConfig> = {
  best: {
    requireHistoric: true,
  },
  newest: {
    orderBy: `
      ORDER BY
        l.updated_at DESC NULLS LAST,
        l.ends_at ASC NULLS LAST
    `,
    requireHistoric: false,
  },
  endingSoon: {
    orderBy: `
      ORDER BY
        l.ends_at ASC NULLS LAST,
        l.updated_at DESC NULLS LAST
    `,
    requireHistoric: false,
    requireEndsAt: true,
  },
};

export type DealsQueryOptions = {
  sort?: DealsApiSort;
  page?: number;
  pageSize?: number;
  market?: MarketCode | "all" | string | null;
};

export async function runDealsQuery(
  options: DealsQueryOptions = {},
): Promise<DealsApiResponse> {
  const sort: DealsApiSort = options.sort ?? "best";
  const sortConfig = SORT_CONFIG[sort] ?? SORT_CONFIG.best;
  const hasConfidenceColumn = await ensureDealConfidenceColumn();
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const market = normalizeMarketCode(
    (options.market as string | null | undefined) ?? null,
  );

  const rawPageSize =
    options.pageSize && Number.isFinite(options.pageSize)
      ? Number(options.pageSize)
      : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE);
  const rawPage =
    options.page && Number.isFinite(options.page) ? Number(options.page) : 1;
  const page = Math.max(rawPage, 1);
  const offset = (page - 1) * pageSize;

  const totalCount = await getTotalCount(
    sortConfig,
    market,
    hasListingsMarketColumn,
  );
  const rows = await fetchListings(
    sort,
    sortConfig,
    pageSize,
    offset,
    hasConfidenceColumn,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn,
    market,
  );
  
  // Map rows to deals and filter out any blacklisted/excluded items (safety net)
  const allItems = rows.map(mapRowToDeal);
  const items: Deal[] = [];
  for (const deal of allItems) {
    const result = await shouldExcludeListingFromCardSurfaces(
      { title: deal.title ?? "", listingId: deal.listingId },
      deal.card ? {
        name: deal.card.name,
        setName: deal.card.setName,
        number: deal.card.cardNumber,
        rarity: null, // rarity not yet in cards table
      } : undefined
    );
    if (!result.excluded) {
      items.push(deal);
    }
  }

  const meta: DealsApiMeta = {
    sort,
    page,
    pageSize,
    totalItems: totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    market,
  };

  return {
    ...meta,
    items,
  };
}

function isGradedBucket(bucket: string | null): boolean {
  if (!bucket) return false;
  return (
    bucket.startsWith("psa_") ||
    bucket.startsWith("bgs_") ||
    bucket.startsWith("cgc_")
  );
}

function deriveBaselineConfidence(
  sampleSize: number | null,
): "high" | "medium" | "low" {
  if (sampleSize == null || sampleSize <= 0) {
    return "low";
  }
  if (sampleSize >= 20) {
    return "high";
  }
  if (sampleSize >= 10) {
    return "medium";
  }
  return "low";
}

async function getTotalCount(
  sortConfig: SortConfig,
  market: MarketCode | "all",
  hasListingsMarketColumn: boolean,
): Promise<number> {
  const baseFilters = buildBaseFilters(
    sortConfig.requireHistoric,
    hasListingsMarketColumn,
    market,
  );
  const endsAtFilter = sortConfig.requireEndsAt
    ? "AND l.ends_at IS NOT NULL"
    : "";
  const res = await query<{ count: string }>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM listings l
      WHERE
        ${baseFilters}
        ${endsAtFilter};
    `,
  );
  return Number(res.rows[0]?.count ?? 0);
}

async function fetchListings(
  sort: DealsApiSort,
  sortConfig: SortConfig,
  pageSize: number,
  offset: number,
  hasConfidenceColumn: boolean,
  hasListingsMarketColumn: boolean,
  hasHistoricalMarketColumn: boolean,
  market: MarketCode | "all",
): Promise<DealRow[]> {
  const baseFilters = buildBaseFilters(
    sortConfig.requireHistoric,
    hasListingsMarketColumn,
    market,
  );
  const endsAtFilter = sortConfig.requireEndsAt
    ? "AND l.ends_at IS NOT NULL"
    : "";
  const orderByClause = buildOrderByClause(sort, hasConfidenceColumn);
  const marketLiteral = market !== "all" ? `'${market}'::text` : "NULL::text";
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn && market !== "all"
      ? `AND hp.market = l.market`
      : hasHistoricalMarketColumn && market !== "all"
        ? `AND hp.market = ${marketLiteral}`
        : "";

  const res = await query<DealRow>(
    `
      SELECT
        l.id,
        l.listing_id,
        l.title,
        l.url,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        l.historic_price_cad,
        l.discount_percent,
        CASE
          WHEN l.historic_price_cad IS NOT NULL
            AND l.total_price_cad IS NOT NULL
            AND l.historic_price_cad <> 0
          THEN (
            (l.total_price_cad::numeric - l.historic_price_cad::numeric)
            / NULLIF(l.historic_price_cad::numeric, 0)
          ) * 100
          ELSE NULL
        END AS calculated_discount,
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
        ${
          hasConfidenceColumn
            ? "l.deal_confidence_weight"
            : "NULL::numeric"
        } AS deal_confidence_weight
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE
        ${baseFilters}
        ${endsAtFilter}
      ${orderByClause}
      LIMIT $1 OFFSET $2;
    `,
    [pageSize, offset],
  );
  return res.rows;
}

function buildBaseFilters(
  requireHistoric: boolean,
  hasListingsMarketColumn: boolean,
  market: MarketCode | "all",
): string {
  const marketClause = hasListingsMarketColumn && market !== "all"
    ? `AND l.market = '${market}'`
    : "";
  return `
    l.total_price_cad IS NOT NULL
    AND l.seller_username IS NOT NULL
    AND l.match_eligible = TRUE
    AND l.shipping_known = TRUE
    ${requireHistoric ? "AND l.historic_price_cad IS NOT NULL" : ""}
    ${marketClause}
    AND NOT EXISTS (
      SELECT 1
      FROM seller_blacklist sb
      WHERE sb.seller_username = l.seller_username
    )
  `;
}

function mapRowToDeal(row: DealRow): Deal {
  const priceCad = row.price_cad != null ? Number(row.price_cad) : null;
  const shippingCad =
    row.shipping_cad != null ? Number(row.shipping_cad) : null;
  const totalPriceCad =
    row.total_price_cad != null ? Number(row.total_price_cad) : null;
  const sampleSize = row.sample_size != null ? Number(row.sample_size) : null;
  const storedConfidenceWeight =
    row.deal_confidence_weight != null
      ? Number(row.deal_confidence_weight)
      : null;
  const conditionBucket = row.card_condition_bucket ?? null;

  const hasBaseline =
    row.historic_price_cad != null &&
    (!isGradedBucket(conditionBucket) || (sampleSize ?? 0) >= 5);
  const historicPriceCad =
    hasBaseline && row.historic_price_cad != null
      ? Number(row.historic_price_cad)
      : null;
  const confidenceWeight =
    storedConfidenceWeight ??
    computeDealConfidenceWeight({
      sampleCount: sampleSize,
      medianPrice: historicPriceCad,
      shippingPrice: shippingCad,
      stdDev: null,
    });

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

  let rawDiscount = hasBaseline
    ? computeDiscountPercent(totalPriceCad ?? priceCad, historicPriceCad)
    : null;
  if (hasBaseline && rawDiscount == null && storedDiscount != null) {
    rawDiscount = Number.isNaN(storedDiscount) ? null : storedDiscount;
  }

  const displayDiscount = hasBaseline
    ? getDisplayDiscountPercent({
        discount_percent: rawDiscount,
        seller_feedback_count: sellerFeedbackCount,
        seller_positive_percent: sellerPositivePercent,
      })
    : null;

  return {
    id: row.id,
    cardId: row.card_id ?? null,
    title: row.title,
    url: row.url,
    priceCad,
    shippingCad,
    totalPriceCad,
    historicPriceCad,
    listingId: row.listing_id ?? null,
    historicSampleCount: sampleSize,
    historicBaselineBucketUsed: conditionBucket ?? null,
    historicBaselineConfidence: hasBaseline
      ? deriveBaselineConfidence(sampleSize)
      : "none",
    thumbnailUrl: row.thumbnail_url,
    sellerUsername: row.seller_username ?? null,
    sellerStoreName: row.seller_store_name ?? null,
    discountPercent: displayDiscount,
    sellerFeedbackCount,
    sellerPositivePercent,
    sampleSize,
    condition: conditionBucket,
    setName: row.card_set_name ?? null,
    cardName: row.card_name ?? null,
    confidenceWeight,
    market: row.market,
    endsAt: row.ends_at,
    confidenceWeight,
    card:
      row.card_id == null
        ? null
        : {
            id: row.card_id,
            name: row.card_name,
            setName: row.card_set_name,
            cardNumber: row.card_number,
            conditionBucket: row.card_condition_bucket,
          },
  };
}

function buildOrderByClause(
  sort: DealsApiSort,
  hasConfidenceColumn: boolean,
): string {
  switch (sort) {
    case "best":
    default:
      return `
        ORDER BY
          calculated_discount ASC NULLS LAST,
          ${
            hasConfidenceColumn
              ? "l.deal_confidence_weight DESC NULLS LAST,"
              : ""
          }
          COALESCE(l.total_usd, l.total_price_cad) ASC,
          l.ends_at ASC NULLS LAST
      `;
    case "newest":
      return `
        ORDER BY
          l.updated_at DESC NULLS LAST,
          l.ends_at ASC NULLS LAST
      `;
    case "endingSoon":
      return `
        ORDER BY
          l.ends_at ASC NULLS LAST,
          l.updated_at DESC NULLS LAST
      `;
  }
}

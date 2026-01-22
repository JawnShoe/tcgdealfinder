import { NextRequest, NextResponse } from "next/server";

import { query } from "../../../../../lib/db";
import { convertCad } from "../../../../../lib/money";
import {
  ensureDealConfidenceColumn,
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
  ensureListingsIntegrityColumns,
  LISTINGS_INTEGRITY_MISSING_MESSAGE,
} from "../../../../../lib/schema";
import { computeDealConfidenceWeight } from "../../../../../lib/dealConfidence";
import { shouldExcludeListingFromCardSurfaces } from "../../../../../lib/blacklist";
import {
  SUPPORTED_MARKETS,
  type MarketCode,
  DEFAULT_MARKET,
} from "../../../../../lib/markets";

type ListingDbRow = {
  id: number;
  title: string;
  url: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  total_usd: string | null;
  discount_percent: string | null;
  market: string;
  ends_at: string | null;
  updated_at: string | null;
  thumbnail_url: string | null;
  condition: string;
  median_price_cad: string | null;
  sample_size: number | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  seller_username: string | null;
  seller_store_name: string | null;
  deal_confidence_weight: string | null;
  integrity_status: string | null;
  integrity_reason: string | null;
  integrity_score: number | null;
  override_type: string | null;
};

type ListingRow = {
  id: number;
  condition: string;
  title: string;
  url: string;
  totalPriceCad: number | null;
  totalUsd: number | null;
  historicPriceCad: number | null;
  historicPriceUsd: number | null;
  discountPercent: number | null;
  sampleSize: number | null;
  market: string;
  endsAt: string | null;
  updatedAt: string | null;
  thumbnailUrl: string | null;
  sellerUsername: string | null;
  sellerStoreName: string | null;
  sellerFeedbackCount: number | null;
  sellerPositivePercent: number | null;
  confidenceWeight: number | null;
  integrityStatus: "OK" | "REVIEW";
  integrityReason: string | null;
  integrityScore: number | null;
  overrideType: "ALLOW" | "HARD_BLOCK" | "SOFT_EXCLUDE" | null;
};

async function getListingsForMarkets(
  cardIds: number[],
  markets: MarketCode[],
  hasListingsMarketColumn: boolean,
  hasHistoricalMarketColumn: boolean
): Promise<ListingDbRow[]> {
  if (markets.length === 0 || cardIds.length === 0) return [];
  const hasConfidenceColumn = await ensureDealConfidenceColumn();
  const marketLiteral = `'${DEFAULT_MARKET}'::text`;
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";

  const params: unknown[] = [cardIds, markets];

  const res = await query<ListingDbRow>(
    `
      SELECT
        l.id,
        l.title,
        l.url,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        l.total_usd,
        l.discount_percent,
        ${marketSelect} AS market,
        l.ends_at,
        l.updated_at,
        l.thumbnail_url,
        c.condition_bucket AS condition,
        hp.median_price_cad,
        hp.sample_size,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.seller_username,
        l.seller_store_name,
        ${hasConfidenceColumn ? "l.deal_confidence_weight" : "NULL::numeric"} AS deal_confidence_weight,
        l.integrity_status,
        l.integrity_reason,
        l.integrity_score,
        lo.override_type
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      LEFT JOIN listing_overrides lo ON lo.listing_id = l.listing_id
      WHERE l.card_id = ANY($1)
        AND l.market = ANY($2)
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
              FROM listing_overrides lo2
              WHERE lo2.listing_id = l.listing_id
                AND lo2.override_type = 'ALLOW'
                AND lo2.reason IN (
                  'manual_allow:language_mismatch',
                  'manual_allow:collector_number_mismatch'
                )
            )
          )
        )
        AND l.shipping_known = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY l.discount_percent ASC NULLS LAST, l.total_price_cad ASC NULLS LAST
    `,
    params
  );

  return res.rows;
}

async function getCardInfo(cardId: number): Promise<{
  id: number;
  name: string;
  set_name: string;
  card_number: string | null;
  rarity: string | null;
} | null> {
  const res = await query<{
    id: number;
    name: string;
    set_name: string;
    card_number: string | null;
    rarity: string | null;
  }>(
    `
      SELECT id, name, set_name, card_number, NULL::text AS rarity
      FROM cards
      WHERE id = $1
      LIMIT 1;
    `,
    [cardId]
  );
  return res.rows[0] ?? null;
}

async function getRelatedCardIds(cardInfo: {
  name: string;
  set_name: string;
  card_number: string | null;
}): Promise<number[]> {
  const res = await query<{ id: number }>(
    `
      SELECT id
      FROM cards
      WHERE name = $1
        AND set_name = $2
        AND card_number = $3
      ORDER BY condition_bucket;
    `,
    [cardInfo.name, cardInfo.set_name, cardInfo.card_number]
  );
  return res.rows.map((row) => row.id);
}

function mapListingRow(row: ListingDbRow): ListingRow {
  const shippingCad =
    row.shipping_cad !== null && row.shipping_cad !== undefined
      ? Number(row.shipping_cad)
      : null;
  const fallbackPrice =
    row.price_cad !== null || shippingCad !== null
      ? Number(row.price_cad ?? 0) + Number(shippingCad ?? 0)
      : null;
  const totalPriceCad =
    row.total_price_cad !== null && row.total_price_cad !== undefined
      ? Number(row.total_price_cad)
      : fallbackPrice;
  const totalUsd =
    row.total_usd !== null && row.total_usd !== undefined
      ? Number(row.total_usd)
      : null;
  const historicPriceCad =
    row.median_price_cad != null ? Number(row.median_price_cad) : null;
  const historicPriceUsd =
    historicPriceCad != null ? convertCad(historicPriceCad, "USD") : null;
  const sampleSize =
    row.sample_size !== null && row.sample_size !== undefined
      ? Number(row.sample_size)
      : null;
  const sellerFeedbackCount =
    row.seller_feedback_count != null
      ? Number(row.seller_feedback_count)
      : null;
  const sellerPositivePercent =
    row.seller_positive_percent != null
      ? Number(row.seller_positive_percent)
      : null;
  const storedWeight =
    row.deal_confidence_weight != null
      ? Number(row.deal_confidence_weight)
      : null;
  const confidenceWeight =
    storedWeight ??
    computeDealConfidenceWeight({
      sampleCount: sampleSize,
      medianPrice: historicPriceCad,
      stdDev: null,
      shippingPrice: shippingCad,
    });

  return {
    id: row.id,
    condition: row.condition,
    title: row.title,
    url: row.url,
    totalPriceCad,
    totalUsd,
    historicPriceCad,
    historicPriceUsd,
    discountPercent:
      row.discount_percent != null ? Number(row.discount_percent) : null,
    sampleSize,
    market: row.market,
    endsAt: row.ends_at,
    updatedAt: row.updated_at,
    thumbnailUrl: row.thumbnail_url,
    sellerUsername: row.seller_username ?? null,
    sellerStoreName: row.seller_store_name ?? null,
    sellerFeedbackCount,
    sellerPositivePercent,
    confidenceWeight,
    integrityStatus: (row.integrity_status ?? "OK") as "OK" | "REVIEW",
    integrityReason: row.integrity_reason ?? null,
    integrityScore:
      row.integrity_score != null ? Number(row.integrity_score) : null,
    overrideType:
      (row.override_type as "ALLOW" | "HARD_BLOCK" | "SOFT_EXCLUDE" | null) ??
      null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const hasIntegrityColumns = await ensureListingsIntegrityColumns();
  if (!hasIntegrityColumns) {
    return new NextResponse(LISTINGS_INTEGRITY_MISSING_MESSAGE, {
      status: 500,
    });
  }
  const { cardId: rawCardId } = await params;
  const cardId = Number(rawCardId);
  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: "Invalid cardId" }, { status: 400 });
  }

  const url = new URL(request.url);
  const marketsParam = url.searchParams.get("markets");
  if (!marketsParam) {
    return NextResponse.json(
      { error: "markets param required" },
      { status: 400 }
    );
  }
  const markets = marketsParam
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => SUPPORTED_MARKETS.includes(value as MarketCode))
    .map((value) => value as MarketCode);
  if (markets.length === 0) {
    return NextResponse.json({ markets: [] });
  }

  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  if (!hasListingsMarketColumn) {
    return NextResponse.json({ markets: [] });
  }
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const cardInfo = await getCardInfo(cardId);
  if (!cardInfo) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  const cardIds = await getRelatedCardIds(cardInfo);
  const listings = await getListingsForMarkets(
    cardIds,
    markets,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn
  );
  const filtered: ListingRow[] = [];
  for (const row of listings) {
    const result = await shouldExcludeListingFromCardSurfaces(
      { title: row.title ?? "", listingId: String(row.id) },
      {
        name: cardInfo.name,
        setName: cardInfo.set_name,
        number: cardInfo.card_number,
        rarity: cardInfo.rarity,
      }
    );
    if (result.excluded) continue;
    filtered.push(mapListingRow(row));
  }

  const grouped = new Map<string, ListingRow[]>();
  for (const row of filtered) {
    const list = grouped.get(row.market) ?? [];
    list.push(row);
    grouped.set(row.market, list);
  }

  const payload = Array.from(grouped.entries()).map(([market, rows]) => ({
    market,
    listings: rows,
  }));

  return NextResponse.json({ markets: payload });
}

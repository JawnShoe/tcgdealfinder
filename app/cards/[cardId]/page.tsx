import CardDetailClient from "../../../components/CardDetailClient";
import { query } from "../../../lib/db";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../../lib/pricing";
import { computeDealConfidenceWeight } from "../../../lib/dealConfidence";
import {
  ensureDealConfidenceColumn,
  ensureCardLanguageColumn,
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../../../lib/schema";
import { DEFAULT_MARKET, type MarketCode } from "../../../lib/markets";
import { getCardStockImageUrl, TCGPLAYER_ATTRIBUTION } from "../../../lib/stockImages";
import { shouldExcludeListingFromCardSurfaces } from "../../../lib/blacklist";

type CardRecord = {
  id: number;
  name: string;
  set_name: string;
  card_number: string | null;
  rarity: string | null;
  condition_bucket: string;
  language: string | null;
};

type HistoricalDbRow = {
  condition: string;
  median_price_cad: string | null;
  sample_size: number | null;
};

type ListingDbRow = {
  id: number;
  title: string;
  url: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  market: string;
  ends_at: string | null;
  thumbnail_url: string | null;
  condition: string;
  median_price_cad: string | null;
  sample_size: number | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  seller_username: string | null;
  seller_store_name: string | null;
  deal_confidence_weight: string | null;
};

type CardDetail = {
  card: {
    id: number;
    name: string;
    setName: string;
    collectorNumber: string | null;
    rarity: string | null;
    condition: string | null;
    stockImageUrl?: string | null;
  };
  historicals: Array<{
    condition: string;
    medianPriceCad: number | null;
    sampleSize: number | null;
  }>;
  listings: Array<{
    id: number;
    condition: string;
    title: string;
    url: string;
    totalPriceCad: number | null;
    historicPriceCad: number | null;
    discountPercent: number | null;
    sampleSize: number | null;
    market: string;
    endsAt: string | null;
    thumbnailUrl: string | null;
    sellerUsername: string | null;
    sellerStoreName: string | null;
    sellerFeedbackCount: number | null;
    sellerPositivePercent: number | null;
    confidenceWeight: number | null;
  }>;
};

function isGradedBucket(bucket: string | null): boolean {
  if (!bucket) return false;
  return (
    bucket.startsWith("psa_") ||
    bucket.startsWith("bgs_") ||
    bucket.startsWith("cgc_")
  );
}

async function getCard(
  cardId: number,
  hasLanguageColumn: boolean,
): Promise<CardRecord | null> {
  const res = await query<CardRecord>(
    `
      SELECT
        id,
        name,
        set_name,
        card_number,
        ${hasLanguageColumn ? "language" : "NULL::text AS language"},
        condition_bucket,
        NULL::text AS rarity
      FROM cards
      WHERE id = $1
    `,
    [cardId],
  );
  return res.rows[0] ?? null;
}

async function getRelatedCards(
  card: CardRecord,
  hasLanguageColumn: boolean,
): Promise<CardRecord[]> {
  const res = await query<CardRecord>(
    `
      SELECT
        id,
        name,
        set_name,
        card_number,
        ${hasLanguageColumn ? "language" : "NULL::text AS language"},
        condition_bucket,
        NULL::text AS rarity
      FROM cards
      WHERE name = $1
        AND set_name = $2
        AND card_number = $3
      ORDER BY condition_bucket
    `,
    [card.name, card.set_name, card.card_number],
  );
  return res.rows;
}

async function getHistoricals(cardIds: number[]): Promise<HistoricalDbRow[]> {
  if (cardIds.length === 0) return [];

  const res = await query<HistoricalDbRow>(
    `
      SELECT
        c.condition_bucket AS condition,
        hp.median_price_cad,
        hp.sample_size
      FROM historical_prices hp
      JOIN cards c ON c.id = hp.card_id
      WHERE hp.card_id = ANY($1)
      ORDER BY c.condition_bucket
    `,
    [cardIds],
  );

  return res.rows;
}

async function getListings(
  cardIds: number[],
  market: MarketCode,
  hasListingsMarketColumn: boolean,
  hasHistoricalMarketColumn: boolean,
): Promise<ListingDbRow[]> {
  if (cardIds.length === 0) return [];
  const hasConfidenceColumn = await ensureDealConfidenceColumn();
  const params: unknown[] = [cardIds];
  let marketFilterClause = "";
  if (hasListingsMarketColumn) {
    params.push(market);
    marketFilterClause = "AND l.market = $2";
  }
  const marketLiteral = `'${market}'::text`;
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";

  const res = await query<ListingDbRow>(
    `
      SELECT
        l.id,
        l.title,
        l.url,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        ${marketSelect} AS market,
        l.ends_at,
        l.thumbnail_url,
        c.condition_bucket AS condition,
        hp.median_price_cad,
        hp.sample_size,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.seller_username,
        l.seller_store_name,
        ${
          hasConfidenceColumn
            ? "l.deal_confidence_weight"
            : "NULL::numeric"
        } AS deal_confidence_weight
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE l.card_id = ANY($1)
        ${marketFilterClause}
        AND l.seller_username IS NOT NULL
        AND l.match_eligible = TRUE
        AND l.shipping_known = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY l.discount_percent ASC NULLS LAST, l.total_price_cad ASC NULLS LAST
    `,
    params,
  );

  return res.rows;
}

async function getCardDetail(cardId: number): Promise<CardDetail | null> {
  const hasLanguageColumn = await ensureCardLanguageColumn();
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const market: MarketCode = DEFAULT_MARKET;
  const cardRecord = await getCard(cardId, hasLanguageColumn);
  if (!cardRecord) return null;

  const relatedCards = await getRelatedCards(
    cardRecord,
    hasLanguageColumn,
  );
  const cardIds = relatedCards.map((c) => c.id);

  const historicalRows = await getHistoricals(cardIds);
  const listingsRows = await getListings(
    cardIds,
    market,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn,
  );

  const historicals = historicalRows.map((row) => ({
    condition: row.condition,
    medianPriceCad:
      row.median_price_cad !== null ? Number(row.median_price_cad) : null,
    sampleSize: row.sample_size,
  }));

  let listings = listingsRows.map((row) => {
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

    const sampleSize =
      row.sample_size !== null && row.sample_size !== undefined
        ? Number(row.sample_size)
        : null;
    const conditionBucket = row.condition;
    const hasBaseline =
      row.median_price_cad !== null &&
      (!isGradedBucket(conditionBucket) || (sampleSize ?? 0) >= 5);
    const medianPriceCad =
      hasBaseline && row.median_price_cad !== null
        ? Number(row.median_price_cad)
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
        medianPrice: medianPriceCad,
        stdDev: null,
        shippingPrice: shippingCad,
      });

    const rawDiscount =
      hasBaseline && medianPriceCad != null
        ? computeDiscountPercent(totalPriceCad, medianPriceCad)
        : null;

    const discountPercent = hasBaseline
      ? getDisplayDiscountPercent({
          discount_percent: rawDiscount,
          seller_feedback_count: sellerFeedbackCount,
          seller_positive_percent: sellerPositivePercent,
        })
      : null;

    return {
      id: row.id,
      condition: row.condition,
      title: row.title,
      url: row.url,
      totalPriceCad,
      historicPriceCad: medianPriceCad,
      discountPercent,
      sampleSize,
      market: row.market,
      endsAt: row.ends_at,
      thumbnailUrl: row.thumbnail_url,
      sellerUsername: row.seller_username ?? null,
      sellerStoreName: row.seller_store_name ?? null,
      sellerFeedbackCount,
      sellerPositivePercent,
      confidenceWeight,
    };
  });

  // Safety net: filter out any blacklisted/excluded items that slipped through ingestion
  const filteredListings: Listing[] = [];
  for (const listing of listings) {
    const result = await shouldExcludeListingFromCardSurfaces(
      { title: listing.title ?? "", listingId: String(listing.id) }, // listingId must be stable for overrides/backfill (use DB listing id)
      {
        name: cardRecord.name,
        setName: cardRecord.set_name,
        number: cardRecord.card_number,
        rarity: cardRecord.rarity,
      }
    );
    if (!result.excluded) {
      filteredListings.push(listing);
    }
  }

  // Fetch stock image for hero display
  const stockImage = await getCardStockImageUrl(
    cardRecord.set_name,
    cardRecord.name,
    cardRecord.card_number ?? undefined
  );

  return {
    card: {
      id: cardRecord.id,
      name: cardRecord.name,
      setName: cardRecord.set_name,
      collectorNumber: cardRecord.card_number,
      rarity: cardRecord.rarity,
      condition: cardRecord.condition_bucket,
      stockImageUrl: stockImage?.url ?? null,
    },
    historicals,
    listings: filteredListings,
  };
}

type CardPageProps = {
  params: { cardId: string };
};

export default async function CardPage({ params }: CardPageProps) {
  const cardId = Number(params.cardId);
  if (!Number.isFinite(cardId)) {
    return null;
  }
  console.log("USING APP ROUTER: /cards/[cardId]", { cardId });

  const detail = await getCardDetail(cardId);
  if (!detail) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-10 lg:pt-6 lg:pb-12">
        <CardDetailClient detail={detail} />
        <p className="mt-4 text-xs text-slate-400 text-right">
          {TCGPLAYER_ATTRIBUTION}
        </p>
      </div>
    </main>
  );
}

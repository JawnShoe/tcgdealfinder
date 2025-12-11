import CardDetailClient from "../../../components/CardDetailClient";
import { query } from "../../../lib/db";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../../lib/pricing";

type CardRecord = {
  id: number;
  name: string;
  set_name: string;
  card_number: string | null;
  rarity: string | null;
  condition_bucket: string;
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
};

type CardDetail = {
  card: {
    id: number;
    name: string;
    setName: string;
    collectorNumber: string | null;
    rarity: string | null;
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
    medianPriceCad: number | null;
    discountPercent: number | null;
    sampleSize: number | null;
    market: string;
    endsAt: string | null;
    thumbnailUrl: string | null;
    sellerUsername: string | null;
    sellerFeedbackCount: number | null;
    sellerPositivePercent: number | null;
  }>;
};

async function getCard(cardId: number): Promise<CardRecord | null> {
  const res = await query<CardRecord>(
    `
      SELECT
        id,
        name,
        set_name,
        card_number,
        condition_bucket,
        NULL::text AS rarity
      FROM cards
      WHERE id = $1
    `,
    [cardId],
  );
  return res.rows[0] ?? null;
}

async function getRelatedCards(card: CardRecord): Promise<CardRecord[]> {
  const res = await query<CardRecord>(
    `
      SELECT
        id,
        name,
        set_name,
        card_number,
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

async function getListings(cardIds: number[]): Promise<ListingDbRow[]> {
  if (cardIds.length === 0) return [];

  const res = await query<ListingDbRow>(
    `
      SELECT
        l.id,
        l.title,
        l.url,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        l.market,
        l.ends_at,
        l.thumbnail_url,
        c.condition_bucket AS condition,
        hp.median_price_cad,
        hp.sample_size,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.seller_username
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
      WHERE l.card_id = ANY($1)
        AND l.seller_username IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY l.discount_percent ASC NULLS LAST, l.total_price_cad ASC NULLS LAST
    `,
    [cardIds],
  );

  return res.rows;
}

async function getCardDetail(cardId: number): Promise<CardDetail | null> {
  const cardRecord = await getCard(cardId);
  if (!cardRecord) return null;

  const relatedCards = await getRelatedCards(cardRecord);
  const cardIds = relatedCards.map((c) => c.id);

  const historicalRows = await getHistoricals(cardIds);
  const listingsRows = await getListings(cardIds);

  const historicals = historicalRows.map((row) => ({
    condition: row.condition,
    medianPriceCad:
      row.median_price_cad !== null ? Number(row.median_price_cad) : null,
    sampleSize: row.sample_size,
  }));

  const listings = listingsRows.map((row) => {
    const fallbackPrice =
      row.price_cad !== null || row.shipping_cad !== null
        ? Number(row.price_cad ?? 0) + Number(row.shipping_cad ?? 0)
        : null;

    const totalPriceCad =
      row.total_price_cad !== null && row.total_price_cad !== undefined
        ? Number(row.total_price_cad)
        : fallbackPrice;

    const medianPriceCad =
      row.median_price_cad !== null ? Number(row.median_price_cad) : null;
    const sampleSize = row.sample_size ?? null;

    const sellerFeedbackCount =
      row.seller_feedback_count != null
        ? Number(row.seller_feedback_count)
        : null;
    const sellerPositivePercent =
      row.seller_positive_percent != null
        ? Number(row.seller_positive_percent)
        : null;

    const rawDiscount = computeDiscountPercent(
      totalPriceCad,
      medianPriceCad,
    );

    const discountPercent =
      sampleSize !== null && sampleSize < 5
        ? null
        : getDisplayDiscountPercent({
            discount_percent: rawDiscount,
            seller_feedback_count: sellerFeedbackCount,
            seller_positive_percent: sellerPositivePercent,
          });

    return {
      id: row.id,
      condition: row.condition,
      title: row.title,
      url: row.url,
      totalPriceCad,
      medianPriceCad,
      discountPercent,
      sampleSize,
      market: row.market,
      endsAt: row.ends_at,
      thumbnailUrl: row.thumbnail_url,
      sellerUsername: row.seller_username ?? null,
      sellerFeedbackCount,
      sellerPositivePercent,
    };
  });

  return {
    card: {
      id: cardRecord.id,
      name: cardRecord.name,
      setName: cardRecord.set_name,
      collectorNumber: cardRecord.card_number,
      rarity: cardRecord.rarity,
    },
    historicals,
    listings,
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
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12">
        <CardDetailClient detail={detail} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import DealsTable from "../../../components/DealsTable";
import type { Deal } from "../../../types/deal";
import { query } from "../../../lib/db";
import { formatCurrency } from "../../../lib/dealFormatting";
import { FX_RATE_COPY } from "../../../lib/money";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../../lib/pricing";
import { DEFAULT_MARKET, type MarketCode } from "../../../lib/markets";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../../../lib/schema";

const HOT_CARD_LIMIT = 8;
const HOT_CARD_THRESHOLD = -5;
const DEAL_LIMIT = 400;

type MarketContext = {
  market: MarketCode;
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

type DealRow = {
  id: number;
  title: string;
  url: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  historic_price_cad: string | null;
  discount_percent: string | null;
  market: string;
  ends_at: string | null;
  thumbnail_url: string | null;
  sample_size: number | null;
  seller_username: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  card_id: number | null;
  card_name: string | null;
  card_set_name: string | null;
  card_number: string | null;
  card_condition_bucket: string | null;
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
    [setName],
  );
  return Boolean(res.rows[0]?.exists);
}

async function getSetOverview(
  setName: string,
  context: MarketContext,
): Promise<SetOverviewStats> {
  const totalsRes = await query<{ count: string }>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM cards
      WHERE set_name = $1;
    `,
    [setName],
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
        AND l.match_eligible = TRUE
        AND l.shipping_known = TRUE
        ${context.hasListingsMarketColumn ? "AND l.market = $2" : ""}
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        );
    `,
    context.hasListingsMarketColumn ? [setName, context.market] : [setName],
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
  context: MarketContext,
): Promise<HotCard[]> {
  const params: (string | number)[] = [
    setName,
    HOT_CARD_THRESHOLD,
    HOT_CARD_LIMIT,
  ];
  const marketFilterClause = context.hasListingsMarketColumn
    ? "AND l.market = $4"
    : "";
  if (context.hasListingsMarketColumn) {
    params.push(context.market);
  }
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
        ${
          context.hasHistoricalMarketColumn
            ? `AND hp.market = '${context.market}'`
            : ""
        }
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
          AND l.match_eligible = TRUE
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
    params,
  );

  return res.rows.map((row) => {
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
}

async function getSetDeals(
  setName: string,
  context: MarketContext,
): Promise<Deal[]> {
  const marketLiteral = `'${context.market}'::text`;
  const marketSelect = context.hasListingsMarketColumn
    ? "l.market"
    : marketLiteral;
  const marketFilterClause = context.hasListingsMarketColumn
    ? "AND l.market = $3"
    : "";
  const historicalJoinClause =
    context.hasHistoricalMarketColumn && context.hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : context.hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const params: (string | number)[] = [setName, DEAL_LIMIT];
  if (context.hasListingsMarketColumn) {
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
        l.historic_price_cad,
        l.discount_percent,
        ${marketSelect} AS market,
        l.ends_at,
        l.thumbnail_url,
        l.seller_username,
        l.seller_feedback_count,
        l.seller_positive_percent,
        hp.sample_size,
        c.id   AS card_id,
        c.name AS card_name,
        c.set_name AS card_set_name,
        c.card_number AS card_number,
        c.condition_bucket AS card_condition_bucket
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE c.set_name = $1
        AND l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
        AND l.match_eligible = TRUE
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
    params,
  );

  return res.rows.map((row) => {
    const priceCad = row.price_cad != null ? Number(row.price_cad) : null;
    const shippingCad =
      row.shipping_cad != null ? Number(row.shipping_cad) : null;
    const totalPriceCad =
      row.total_price_cad != null ? Number(row.total_price_cad) : null;
    const historicPriceCad =
      row.historic_price_cad != null ? Number(row.historic_price_cad) : null;
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

    const storedDiscount =
      row.discount_percent != null ? Number(row.discount_percent) : null;
    let rawDiscount = computeDiscountPercent(
      totalPriceCad ?? priceCad,
      historicPriceCad,
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
      historicPriceCad,
      discountPercent: displayDiscount,
      sampleSize,
      market: row.market,
      endsAt: row.ends_at,
      thumbnailUrl: row.thumbnail_url,
      sellerUsername: row.seller_username,
      sellerFeedbackCount,
      sellerPositivePercent,
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
    };
  });
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

export default async function SetDetailPage({
  params,
}: {
  params: { setId: string };
}) {
  const setName = decodeSetName(params.setId);
  const exists = await ensureSetExists(setName);
  if (!exists) {
    notFound();
  }

  const market = DEFAULT_MARKET;
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const marketContext: MarketContext = {
    market,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn,
  };

  const [stats, hotCards, deals] = await Promise.all([
    getSetOverview(setName, marketContext),
    getHotCards(setName, marketContext),
    getSetDeals(setName, marketContext),
  ]);

  return (
    <main className="page-shell space-y-6 py-6">
      <div className="panel space-y-2">
        <Link href="/sets" className="text-xs text-slate-500 hover:underline">
          ← Browse all sets
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">{setName}</h1>
        <p className="text-sm text-slate-600">
          Tracking {stats.totalCardsTracked} card
          {stats.totalCardsTracked === 1 ? "" : "s"} from this set.
        </p>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Prices shown in USD (converted from CAD). {FX_RATE_COPY}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <div>
            <span className="text-slate-500">Cards with deals:</span>{" "}
            <strong>{stats.cardCountWithDeals}</strong>
          </div>
          <div>
            <span className="text-slate-500">Active listings:</span>{" "}
            <strong>{stats.activeListingsCount}</strong>
          </div>
          <div>
            <span className="text-slate-500">Avg discount:</span>{" "}
            <strong>{formatDiscount(stats.avgDiscountPercent)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Best discount:</span>{" "}
            <strong>{formatDiscount(stats.bestDiscountPercent)}</strong>
          </div>
        </div>
      </div>

      <div className="panel space-y-3">
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
            No under-historic deals detected right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotCards.map((card) => (
              <div
                key={card.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">
                  <Link href={`/cards/${card.id}`} className="hover:underline">
                    {card.name}
                  </Link>
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
                  <span className={discountBadgeClass(card.bestDealDiscountPercent)}>
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
      </div>

      <div className="panel">
        {deals.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No active listings for this set right now.
          </div>
        ) : (
          <DealsTable deals={deals} page={1} totalPages={1} />
        )}
      </div>
    </main>
  );
}

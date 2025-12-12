"use server";

import { AdminDealActions } from "../../components/AdminDealActions";
import { TrustedBadge } from "../../components/TrustedBadge";
import { CardIdentityBlock } from "../../components/CardIdentity";
import { query } from "../../lib/db";
import { formatCurrency } from "../../lib/dealFormatting";
import { FX_RATE_COPY } from "../../lib/money";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../lib/pricing";
import { DEFAULT_MARKET } from "../../lib/markets";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../../lib/schema";

type EndingSoonRow = {
  listing_id: number;
  card_id: number | null;
  card_name: string | null;
  set_name: string | null;
  title: string | null;
  condition: string | null;
  total_price_cad: string | null;
  historic_price_cad: string | null;
  sample_size: number | null;
  discount_percent: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  market: string;
  ends_at: string | null;
  listing_url: string;
  seller_username: string | null;
};

type EndingSoonDeal = {
  listingId: number;
  listingTitle: string | null;
  cardId: number | null;
  cardName: string | null;
  setName: string | null;
  condition: string | null;
  totalPriceCad: number | null;
  medianPriceCad: number | null;
  sampleSize: number | null;
  discountPercent: number | null;
  sellerFeedbackCount: number | null;
  sellerPositivePercent: number | null;
  market: string;
  endsAt: Date | null;
  listingUrl: string;
  sellerUsername: string | null;
};

const MIN_SAMPLE_SIZE = 20;
const TRUSTED_FEEDBACK = 20;
const TRUSTED_POSITIVE_PERCENT = 98;

function formatDate(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) {
    return "--";
  }
  return value.toLocaleString();
}

function discountClass(value: number | null | undefined): string {
  if (value == null) return "";
  if (value <= -20) return "discount-good";
  if (value >= 5) return "discount-bad";
  return "discount-neutral";
}

function getConfidenceLabel(sampleSize: number | null | undefined): string {
  if (sampleSize == null) return "";
  if (sampleSize >= 50) return `High n=${sampleSize}`;
  if (sampleSize >= 20) return `Med n=${sampleSize}`;
  if (sampleSize >= 5) return `Low n=${sampleSize}`;
  return `Very low n=${sampleSize}`;
}

function formatSeller(deal: EndingSoonDeal): JSX.Element {
  const name = deal.sellerUsername ?? "Unknown seller";
  const trusted =
    deal.sellerFeedbackCount != null &&
    deal.sellerFeedbackCount >= TRUSTED_FEEDBACK &&
    deal.sellerPositivePercent != null &&
    deal.sellerPositivePercent >= TRUSTED_POSITIVE_PERCENT;
  return (
    <span className="flex min-w-0 items-center gap-2 text-slate-700">
      <span className="truncate" title={name}>
        {name}
      </span>
      {trusted && <TrustedBadge className="flex-none" />}
    </span>
  );
}

async function getEndingSoonDeals(): Promise<EndingSoonDeal[]> {
  const market = DEFAULT_MARKET;
  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const marketLiteral = `'${market}'::text`;
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";
  const marketFilterClause = hasListingsMarketColumn ? "AND l.market = $4" : "";
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
        l.historic_price_cad,
        hp.sample_size,
        l.discount_percent,
        l.seller_feedback_count,
        l.seller_positive_percent,
        ${marketSelect} AS market,
        l.ends_at,
        l.url AS listing_url,
        l.seller_username
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
        AND l.match_eligible = TRUE
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
      ...(hasListingsMarketColumn ? [market] : []),
    ],
  );

  return res.rows.map((row) => {
    const total =
      row.total_price_cad !== null ? Number(row.total_price_cad) : null;
    const historic =
      row.historic_price_cad !== null ? Number(row.historic_price_cad) : null;
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

    const endsAt =
      row.ends_at != null && !Number.isNaN(new Date(row.ends_at).getTime())
        ? new Date(row.ends_at)
        : null;

      return {
        listingId: row.listing_id,
        listingTitle: row.title ?? null,
        cardId: row.card_id,
        cardName: row.card_name,
        setName: row.set_name,
      condition: row.condition,
      totalPriceCad: total,
      medianPriceCad: historic,
      sampleSize,
      discountPercent: displayDiscount,
      sellerFeedbackCount,
      sellerPositivePercent,
      market: row.market,
      endsAt,
      listingUrl: row.listing_url,
      sellerUsername: row.seller_username ?? null,
    };
  });
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function EndingSoonPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const secretParam = searchParams?.secret;
  const requestedSecret = Array.isArray(secretParam)
    ? secretParam[0]
    : secretParam ?? undefined;
  const adminSecret = process.env.ADMIN_SECRET;
  const isAdmin =
    Boolean(adminSecret) && requestedSecret === adminSecret;

  const deals = await getEndingSoonDeals();

  return (
    <main className="page-shell space-y-6 py-6">
      <div className="panel space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">Ending Soon</h1>
        <p className="text-base text-slate-600">
          Trusted discounted listings ending in the next 24 hours.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          Prices shown in USD (converted from CAD). {FX_RATE_COPY}
        </p>
        {deals.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No trusted discounted listings ending in the next 24 hours.
            Check back soon.
          </p>
        ) : (
          <table className="deals-table text-xs md:text-sm">
            <thead>
              <tr>
                <th className="col-card text-left">Card</th>
                <th className="col-condition text-left">Condition</th>
                <th className="col-price text-right">Total (USD)</th>
                <th className="col-historic text-right">Historic (USD)</th>
                <th className="col-sample text-right">Sample</th>
                <th className="col-discount text-right">Discount %</th>
                <th className="col-seller text-left">Seller</th>
                <th className="col-market text-left">Market</th>
                <th className="col-ends text-right">Ends</th>
                <th className="col-link text-right">Listing</th>
                {isAdmin && <th className="col-admin text-left">Admin</th>}
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.listingId}>
                  <td className="col-card text-left">
                    <CardIdentityBlock
                      identity={{
                        primary: deal.cardName ?? deal.listingTitle ?? "Unknown card",
                        setName: deal.setName ?? null,
                        listingTitle: deal.listingTitle,
                        cardId: deal.cardId,
                      }}
                      primaryHref={deal.listingUrl}
                      showListingTitle
                    />
                  </td>
                  <td className="col-condition text-slate-600">
                    {deal.condition ?? "--"}
                  </td>
                  <td className="col-price text-right">
                    {formatCurrency(deal.totalPriceCad)}
                  </td>
                  <td className="col-historic text-right">
                    {formatCurrency(deal.medianPriceCad)}
                  </td>
                  <td className="col-sample text-right text-slate-500">
                    {deal.sampleSize != null
                      ? getConfidenceLabel(deal.sampleSize)
                      : "--"}
                  </td>
                  <td
                    className={`col-discount text-right ${discountClass(
                      deal.discountPercent,
                    )}`}
                  >
                    {deal.discountPercent == null ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <span>
                        {deal.discountPercent > 0 ? "+" : ""}
                        {deal.discountPercent.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="col-seller">{formatSeller(deal)}</td>
                  <td className="col-market text-slate-600">{deal.market}</td>
                  <td className="col-ends text-right text-slate-500">
                    {formatDate(deal.endsAt)}
                  </td>
                  <td className="col-link text-right">
                    <a
                      href={deal.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:underline"
                    >
                      View
                    </a>
                  </td>
                  {isAdmin && (
                    <td className="col-admin align-top">
                      <AdminDealActions
                        listingId={deal.listingId}
                        sellerUsername={deal.sellerUsername}
                        adminSecret={isAdmin ? requestedSecret : undefined}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

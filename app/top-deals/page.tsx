import { AdminDealActions } from "../../components/AdminDealActions";
import { TrustedBadge } from "../../components/TrustedBadge";
import { CardIdentityBlock } from "../../components/CardIdentity";
import { query } from "../../lib/db";
import {
  formatCurrency,
  discountClass,
  formatDiscount,
  formatEndsAt,
  getConfidenceLabel,
} from "../../lib/dealFormatting";
import { FX_RATE_COPY } from "../../lib/money";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../lib/pricing";
import {
  DEFAULT_MARKET,
  getMarketLabel,
  getMarketCompactLabel,
  normalizeMarketCode,
} from "../../lib/markets";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../../lib/schema";

type TopDealRow = {
  listing_id: number;
  title: string;
  url: string;
  total_price_cad: string | null;
  historic_price_cad: string | null;
  discount_percent: string | null;
  market: string;
  ends_at: string | null;
  card_id: number | null;
  card_name: string | null;
  set_name: string | null;
  condition_bucket: string | null;
  sample_size: number | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  seller_username: string | null;
};

type TopDeal = {
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
  market: string;
  endsAt: string | null;
  listingUrl: string;
  sellerFeedbackCount: number | null;
  sellerPositivePercent: number | null;
  trustedSeller: boolean;
  sellerUsername: string | null;
};

const LIMIT = 100;
const MIN_SAMPLE_SIZE = 20;
const MIN_DISCOUNT = 15;
const MIN_SELLER_FEEDBACK_COUNT = 20;
const MIN_SELLER_POSITIVE_PERCENT = 98;

function MarketFlag({ code }: { code: string }) {
  if (code === "EBAY_US" || code === "us" || code === "US") {
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
        <rect width="20" height="14" fill="#B22234" />
        <rect y="1.08" width="20" height="1.08" fill="white" />
        <rect y="3.23" width="20" height="1.08" fill="white" />
        <rect y="5.38" width="20" height="1.08" fill="white" />
        <rect y="7.54" width="20" height="1.08" fill="white" />
        <rect y="9.69" width="20" height="1.08" fill="white" />
        <rect y="11.85" width="20" height="1.08" fill="white" />
        <rect width="8" height="7" fill="#3C3B6E" />
      </svg>
    );
  }
  if (code === "EBAY_CA" || code === "ca" || code === "CA") {
    return (
      <svg width="20" height="14" viewBox="0 0 20 14" className="inline-block">
        <rect width="20" height="14" fill="white" />
        <rect width="5" height="14" fill="#FF0000" />
        <rect x="15" width="5" height="14" fill="#FF0000" />
        <path d="M10 3 L10.5 5 L12 4.5 L10.8 6 L12.5 6.5 L10.5 7 L11 9 L10 7.5 L9 9 L9.5 7 L7.5 6.5 L9.2 6 L8 4.5 L9.5 5 Z" fill="#FF0000" />
      </svg>
    );
  }
  return null;
}

function formatSeller(deal: TopDeal): JSX.Element {
  const name = deal.sellerUsername ?? "Unknown";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate" title={name}>
        {name}
      </span>
      {deal.trustedSeller ? (
        <TrustedBadge className="flex-none" />
      ) : null}
    </div>
  );
}

async function getTopDeals(): Promise<TopDeal[]> {
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
  const marketFilterClause = hasListingsMarketColumn ? "AND l.market = $5" : "";
  const res = await query<TopDealRow>(
    `
      SELECT
        l.id AS listing_id,
        l.title,
        l.url,
        l.total_price_cad,
        l.historic_price_cad,
        l.discount_percent,
        ${marketSelect} AS market,
        l.ends_at,
        c.id   AS card_id,
        c.name AS card_name,
        c.set_name,
        c.condition_bucket,
        hp.sample_size,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.seller_username
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
      LIMIT $4;
    `,
    [
      MIN_SAMPLE_SIZE,
      MIN_SELLER_FEEDBACK_COUNT,
      MIN_SELLER_POSITIVE_PERCENT,
      LIMIT,
      ...(hasListingsMarketColumn ? [market] : []),
    ],
  );

  return res.rows
    .map((row) => {
    const total = row.total_price_cad ? Number(row.total_price_cad) : null;
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

      return {
        listingId: row.listing_id,
        listingTitle: row.title ?? null,
        cardId: row.card_id ?? null,
        cardName: row.card_name ?? null,
        setName: row.set_name ?? null,
        condition: row.condition_bucket ?? null,
        totalPriceCad: total,
        medianPriceCad: historic,
        sampleSize,
        discountPercent: displayDiscount,
        market: row.market,
        endsAt: row.ends_at,
        listingUrl: row.url,
        sellerFeedbackCount,
        sellerPositivePercent,
        trustedSeller:
          sellerFeedbackCount != null &&
          sellerFeedbackCount >= MIN_SELLER_FEEDBACK_COUNT &&
          sellerPositivePercent != null &&
          sellerPositivePercent >= MIN_SELLER_POSITIVE_PERCENT,
        sellerUsername: row.seller_username ?? null,
      };
    })
    .filter(
      (deal) =>
        deal.discountPercent != null &&
        deal.discountPercent <= -MIN_DISCOUNT,
    );
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TopDealsPage({
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

  const deals = await getTopDeals();

  return (
    <main className="page-shell space-y-6 py-6">
      <div className="panel space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">Top Deals</h1>
        <p className="text-base text-slate-600">
          High-confidence listings with strong discounts versus recent medians.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          Prices shown in USD (converted from CAD). {FX_RATE_COPY}
        </p>
        {deals.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-600">
              No high-confidence top deals found right now.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Check back soon for new listings.
            </p>
          </div>
        ) : (
          <table className="deals-table text-xs md:text-sm">
            <thead>
              <tr>
                <th className="col-card text-left">Card</th>
                <th className="col-condition text-left">Condition</th>
                <th className="col-price whitespace-nowrap text-right">Total USD</th>
                <th className="col-historic whitespace-nowrap text-right">Historic USD</th>
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
                <tr key={deal.listingId} className="even:bg-slate-50/50 hover:bg-slate-100">
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
                    {formatDiscount(deal.discountPercent)}
                  </td>
                  <td className="col-seller text-sm text-slate-700">
                    {formatSeller(deal)}
                  </td>
                  <td className="col-market text-slate-600">
                    <span
                      title={getMarketLabel(normalizeMarketCode(deal.market))}
                      className="flex items-center gap-1"
                    >
                      <MarketFlag code={normalizeMarketCode(deal.market)} />
                      <span>{normalizeMarketCode(deal.market) === "EBAY_US" ? "US" : "CA"}</span>
                    </span>
                  </td>
                  <td className="col-ends text-right text-slate-500">
                    {formatEndsAt(deal.endsAt)}
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

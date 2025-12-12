import Link from "next/link";

import { AdminDealActions } from "../../components/AdminDealActions";
import { TrustedBadge } from "../../components/TrustedBadge";
import { query } from "../../lib/db";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../lib/pricing";

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

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `$${value.toFixed(2)}`;
}

function formatEndsAt(value: string | null) {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString();
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

function formatSeller(deal: TopDeal): JSX.Element {
  const name = deal.sellerUsername ?? "Unknown seller";
  return (
    <span className="inline-flex items-center gap-1 text-slate-700">
      {name}
      {deal.trustedSeller && <TrustedBadge />}
    </span>
  );
}

async function getTopDeals(): Promise<TopDeal[]> {
  const res = await query<TopDealRow>(
    `
      SELECT
        l.id AS listing_id,
        l.title,
        l.url,
        l.total_price_cad,
        l.historic_price_cad,
        l.discount_percent,
        l.market,
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
        AND l.match_eligible = TRUE
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
        {deals.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No high-confidence top deals found right now. Try again later.
          </div>
        ) : (
          <table className="deals-table text-xs md:text-sm">
            <thead>
              <tr>
                <th className="col-card text-left">Card</th>
                <th className="col-set text-left">Set</th>
                <th className="col-condition text-left">Condition</th>
                <th className="col-price text-right">Total</th>
                <th className="col-historic text-right">Historic</th>
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
                  <td className="col-card text-sky-700">
                    {deal.cardId ? (
                      <Link href={`/cards/${deal.cardId}`} className="hover:underline">
                        {deal.cardName ?? "Unknown card"}
                      </Link>
                    ) : (
                      deal.cardName ?? "Unknown card"
                    )}
                  </td>
                  <td className="col-set text-slate-600">{deal.setName ?? "--"}</td>
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

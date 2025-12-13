import Image from "next/image";
import { AdminDealActions } from "../../components/AdminDealActions";
import { TrustedBadge } from "../../components/TrustedBadge";
import { CardIdentityBlock } from "../../components/CardIdentity";
import { ConfidenceChip } from "../../components/ConfidenceChip";
import { query } from "../../lib/db";
import {
  formatCurrency,
  discountClass,
  formatDiscount,
  formatEndsAt,
} from "../../lib/dealFormatting";
import {
  getConfidenceLabel as getWeightLabel,
} from "../../lib/dealConfidence";
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
  thumbnail_url: string | null;
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
  thumbnailUrl: string | null;
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

function formatConditionBucket(bucket: string | null): string {
  if (!bucket) return "--";
  const map: Record<string, string> = {
    raw_nm: "Raw NM",
    raw_lp: "Raw LP",
    raw_mp: "Raw MP",
    raw_hp: "Raw HP",
    psa_10: "PSA 10",
    psa_9: "PSA 9",
    psa_8: "PSA 8",
    bgs_10: "BGS 10",
    bgs_95: "BGS 9.5",
    bgs_9: "BGS 9",
    cgc_10: "CGC 10",
    cgc_95: "CGC 9.5",
    cgc_9: "CGC 9",
  };
  return map[bucket] ?? bucket.replace(/_/g, " ").toUpperCase();
}

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
        l.thumbnail_url,
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
        thumbnailUrl: row.thumbnail_url,
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pb-14 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Top Deals</h1>
          <p className="text-sm text-slate-600">
            High-confidence listings with strong discounts versus recent medians.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 lg:px-10 overflow-x-auto">
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
          <table className="min-w-full table-fixed text-sm text-slate-900">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Card</th>
                <th className="px-3 py-2 text-left">Condition</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Total USD</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Historic USD</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Price conf.</th>
                <th className="px-3 py-2 text-left">Seller</th>
                <th className="px-3 py-2 text-left">Market</th>
                <th className="px-3 py-2 text-right">Ends</th>
                <th className="px-3 py-2 text-right">Listing</th>
                {isAdmin && <th className="px-3 py-2 text-left">Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((deal) => (
                <tr key={deal.listingId} className="even:bg-slate-50/50 hover:bg-slate-100">
                  <td className="px-3 py-4 align-middle text-left">
                    <div className="flex items-start gap-2.5">
                      {deal.thumbnailUrl ? (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                          <Image
                            src={deal.thumbnailUrl}
                            alt={deal.listingTitle ?? "Card"}
                            width={64}
                            height={64}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <CardIdentityBlock
                          identity={{
                            primary: deal.cardName ?? deal.listingTitle ?? "Unknown card",
                            setName: deal.setName ?? null,
                            listingTitle: deal.listingTitle,
                            cardId: deal.cardId,
                          }}
                          primaryHref={deal.listingUrl}
                          showListingTitle
                          showViewCardLink
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-middle text-slate-600" title={deal.condition ?? undefined}>
                    {formatConditionBucket(deal.condition)}
                  </td>
                  <td className="px-3 py-4 align-middle text-right text-base font-semibold">
                    {formatCurrency(deal.totalPriceCad)}
                  </td>
                  <td className="px-3 py-4 align-middle text-right text-base text-slate-600">
                    {formatCurrency(deal.medianPriceCad)}
                  </td>
                  <td
                    className={`px-3 py-4 align-middle text-right text-base font-semibold ${discountClass(
                      deal.discountPercent,
                    )}`}
                  >
                    {formatDiscount(deal.discountPercent)}
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <ConfidenceChip
                      weightLabel={getWeightLabel(deal.sampleSize ?? null)}
                      sampleSize={deal.sampleSize}
                      center={true}
                    />
                  </td>
                  <td className="px-3 py-4 align-middle text-sm text-slate-700">
                    {formatSeller(deal)}
                  </td>
                  <td className="px-3 py-4 align-middle text-slate-600">
                    <span
                      title={getMarketLabel(normalizeMarketCode(deal.market))}
                      className="flex items-center gap-1"
                    >
                      <MarketFlag code={normalizeMarketCode(deal.market)} />
                      <span>{normalizeMarketCode(deal.market) === "EBAY_US" ? "US" : "CA"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-4 align-middle text-right text-slate-500">
                    {formatEndsAt(deal.endsAt)}
                  </td>
                  <td className="px-3 py-4 align-middle text-right">
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
                    <td className="px-3 py-4 align-middle">
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
      </div>
    </main>
  );
}

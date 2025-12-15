"use server";

import { AdminDealActions } from "../../components/AdminDealActions";
import { query } from "../../lib/db";
import type { Deal } from "../../types/deal";
import { buildDealViewModel, type DealViewModel } from "../../lib/dealViewModel";
import { EndingSoonColumns } from "../../lib/tableColumns";
import { PAGE_TITLE, PAGE_SUBTITLE, TABLE_CONTAINER } from "../../lib/typography";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../lib/pricing";
import { DEFAULT_MARKET } from "../../lib/markets";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../../lib/schema";

const MIN_SAMPLE_SIZE = 20;
const TRUSTED_FEEDBACK = 20;
const TRUSTED_POSITIVE_PERCENT = 98;

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
  thumbnail_url: string | null;
};

async function getEndingSoonDeals(): Promise<Deal[]> {
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
        l.seller_username,
        l.thumbnail_url
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

  return res.rows.map((row: EndingSoonRow): Deal => {
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

    return {
      id: row.listing_id,
      title: row.title ?? "Unknown listing",
      url: row.listing_url,
      priceCad: null,
      shippingCad: null,
      totalPriceCad: total,
      historicPriceCad: historic,
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
            setName: row.set_name,
            cardNumber: null,
            conditionBucket: row.condition,
          }
        : null,
      condition: row.condition,
      setName: row.set_name,
      cardName: row.card_name,
      cardId: row.card_id,
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
  const isAdmin = Boolean(adminSecret) && requestedSecret === adminSecret;

  const deals = await getEndingSoonDeals();
  const viewModels = deals.map((deal) => buildDealViewModel(deal));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pb-14 space-y-4">
        <div className="space-y-2">
          <h1 className={PAGE_TITLE}>Ending Soon</h1>
          <p className={PAGE_SUBTITLE}>
            Trusted discounted listings ending in the next 24 hours.
          </p>
        </div>

        <div className={`${TABLE_CONTAINER} overflow-x-auto`}>
          {viewModels.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-600">
                No trusted discounted listings ending in the next 24 hours.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Check back soon for new listings.
              </p>
            </div>
          ) : (
            <table className="min-w-full table-fixed text-sm text-slate-900">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {EndingSoonColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.headerClassName} ${col.width ?? ""}`}
                    >
                      {col.headerLabel}
                    </th>
                  ))}
                  {isAdmin && (
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Admin
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewModels.map((vm) => (
                  <tr
                    key={vm.deal.id}
                    className="even:bg-slate-50/50 hover:bg-slate-100"
                  >
                    {EndingSoonColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`${col.cellClassName} ${col.width ?? ""}`}
                      >
                        {col.renderCell(vm, {
                          showListingTitle: true,
                          showViewCardLink: true,
                        })}
                      </td>
                    ))}
                    {isAdmin && (
                      <td className="px-3 py-4 align-middle">
                        <AdminDealActions
                          listingId={vm.deal.id}
                          sellerUsername={vm.deal.sellerUsername}
                          adminSecret={requestedSecret}
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

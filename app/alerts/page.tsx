import DealsTable from "../../components/DealsTable";
import type { Deal } from "../../types/deal";
import { query } from "../../lib/db";
import { getDisplayDiscountPercent } from "../../lib/pricing";
import {
  warnIfStoreNamesMissing,
  normalizeSellerStoreName,
} from "../../lib/sellerDisplay";

const WINDOW_HOURS = 36;
const ALERT_LIMIT = 150;

type AlertRow = {
  id: number;
  created_at: string;
  card_id: number;
  card_name: string;
  card_set_name: string;
  card_number: string | null;
  total_price_cad: string | null;
  median_price_cad: string | null;
  discount_percent: string | null;
  listing_id: number | null;
  listing_title: string | null;
  listing_url: string | null;
  listing_market: string | null;
  listing_thumbnail_url: string | null;
  listing_ends_at: string | null;
  seller_username: string | null;
  seller_store_name: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  sample_size: number | null;
};

async function fetchRecentAlerts(): Promise<Deal[]> {
  const res = await query<AlertRow>(
    `
      SELECT
        al.id,
        al.created_at,
        al.card_id,
        c.name AS card_name,
        c.set_name AS card_set_name,
        c.card_number,
        al.total_price_cad,
        al.median_price_cad,
        al.discount_percent,
        al.listing_id,
        l.title AS listing_title,
        l.url AS listing_url,
        l.market AS listing_market,
        l.thumbnail_url AS listing_thumbnail_url,
        l.ends_at AS listing_ends_at,
        l.seller_username,
        l.seller_store_name,
        l.seller_feedback_count,
        l.seller_positive_percent,
        hp.sample_size
      FROM alerts_log al
      JOIN cards c ON c.id = al.card_id
      LEFT JOIN listings l ON l.id = al.listing_id
      LEFT JOIN historical_prices hp ON hp.card_id = al.card_id
      WHERE al.created_at >= NOW() - INTERVAL '${WINDOW_HOURS} hours'
      ORDER BY al.discount_percent ASC NULLS LAST, al.created_at DESC
      LIMIT $1;
    `,
    [ALERT_LIMIT],
  );

  const deals = res.rows.map((row) => {
    const totalPrice =
      row.total_price_cad != null ? Number(row.total_price_cad) : null;
    const historicPrice =
      row.median_price_cad != null ? Number(row.median_price_cad) : null;
    const rawDiscount =
      row.discount_percent != null ? Number(row.discount_percent) : null;
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

    const displayDiscount =
      sampleSize !== null && sampleSize < 5
        ? null
        : getDisplayDiscountPercent({
            discount_percent: rawDiscount,
            seller_feedback_count: sellerFeedbackCount,
            seller_positive_percent: sellerPositivePercent,
          });

    return {
      id: row.listing_id ?? row.id,
      title: row.listing_title ?? row.card_name,
      url: row.listing_url ?? `/cards/${row.card_id}`,
      priceCad: totalPrice,
      shippingCad: null,
      totalPriceCad: totalPrice,
      historicPriceCad: historicPrice,
      discountPercent: displayDiscount,
      sampleSize,
      market: row.listing_market ?? "UNKNOWN",
      endsAt: row.listing_ends_at,
      thumbnailUrl: row.listing_thumbnail_url,
      sellerUsername: row.seller_username,
      sellerStoreName: normalizeSellerStoreName(row.seller_store_name),
      sellerFeedbackCount,
      sellerPositivePercent,
      card: {
        id: row.card_id,
        name: row.card_name,
        setName: row.card_set_name,
        cardNumber: row.card_number,
        conditionBucket: null,
      },
      condition: null,
      setName: row.card_set_name,
      cardName: row.card_name,
      cardId: row.card_id,
    } satisfies Deal;
  });
  warnIfStoreNamesMissing(deals, "alerts");
  return deals;
}

export default async function AlertsPage() {
  const deals = await fetchRecentAlerts();
  return (
    <main className="page-shell space-y-6 py-6">
      <div className="panel space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">Recent Alerts</h1>
        <p className="text-base text-slate-600">
          Latest under-historic deals detected in the last {WINDOW_HOURS} hours.
          Alerts are snapshots; listings may change or end.
        </p>
      </div>

      {deals.length === 0 ? (
        <div className="panel space-y-3 text-center text-sm text-slate-600">
          <p>No alerts found in the last {WINDOW_HOURS} hours.</p>
          <a href="/" className="inline-link">
            Browse current deals
          </a>
        </div>
      ) : (
        <DealsTable deals={deals} page={1} totalPages={1} />
      )}
    </main>
  );
}

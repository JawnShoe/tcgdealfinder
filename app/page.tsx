import DealsTable from "@/components/DealsTable";
import FeaturedDealsStrip from "@/components/FeaturedDealsStrip";
import { query } from "@/lib/db";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "@/lib/pricing";
import type { Deal } from "@/types/deal";

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

async function getHomePageDeals(): Promise<Deal[]> {
  const PAGE_SIZE = 50;

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
        l.market,
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
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
      LEFT JOIN cards c ON c.id = l.card_id
      WHERE
        l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY
        l.discount_percent ASC NULLS LAST,
        l.total_price_cad ASC,
        l.ends_at ASC NULLS LAST
      LIMIT $1;
    `,
    [PAGE_SIZE],
  );

  const deals = res.rows.map((row: DealRow) => {
    const priceCad =
      row.price_cad != null ? Number(row.price_cad) : null;
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
      cardId: row.card_id ?? null,
      title: row.title,
      url: row.url,
      priceCad,
      shippingCad,
      totalPriceCad,
      historicPriceCad,
      thumbnailUrl: row.thumbnail_url,
      sellerUsername: row.seller_username ?? null,
      discountPercent: displayDiscount,
      sellerFeedbackCount,
      sellerPositivePercent,
      sampleSize,
      condition: row.card_condition_bucket ?? null,
      setName: row.card_set_name ?? null,
      cardName: row.card_name ?? null,
      market: row.market,
      endsAt: row.ends_at,
      card:
        row.card_id == null
          ? null
          : {
              id: row.card_id,
              name: row.card_name,
              setName: row.card_set_name,
              cardNumber: row.card_number,
              conditionBucket: row.card_condition_bucket,
            },
    } as Deal;
  });

  return deals;
}

export default async function HomePage() {
  console.log("USING APP ROUTER: /");
  const deals = await getHomePageDeals();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-4 pb-8 lg:pt-6 lg:pb-12 space-y-5 lg:space-y-7">
        {/* Hero */}
        <section>
          <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-6 sm:px-7 lg:px-10">
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-center lg:gap-12 xl:gap-16">
              <div className="space-y-4 lg:pr-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
                  Real-time arbitrage radar
                </p>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
                    {"Find undervalued Pokemon cards in seconds."}
                  </h1>
                  <p className="text-sm md:text-base text-slate-600 max-w-2xl">
                    TCG Deal Finder scores every live eBay listing by discount, seller trust, and data confidence so you only spend time on the safest opportunities.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 sm:grid-cols-3 lg:pl-6">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Coverage</p>
                  <p className="text-base font-semibold text-slate-900">200+ live deals tracked</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Trusted sellers</p>
                  <p className="text-base font-semibold text-slate-900">40+ verified accounts</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Fresh data</p>
                  <p className="text-base font-semibold text-slate-900">Updated every day</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured deals */}
        <section>
          <FeaturedDealsStrip deals={deals} />
        </section>

        {/* All live deals */}
        <section>
          <div className="mx-auto max-w-7xl rounded-2xl bg-white shadow-sm border border-slate-200 px-5 py-5 sm:px-7 lg:px-10 deals-card">
            <h2 className="text-lg font-semibold tracking-tight mb-2">
              All live deals
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Filter by condition, region, discount, or price to focus on the safest listings for your collecting goals.
            </p>
            <DealsTable deals={deals} />
          </div>
        </section>
      </div>
    </main>
  );
}

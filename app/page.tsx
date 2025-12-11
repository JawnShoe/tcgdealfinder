import DealsTable from "@/components/DealsTable";
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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Hero */}
        <section>
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Real-time arbitrage radar
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                Find undervalued Pokémon cards in seconds.
              </h1>
              <p className="text-sm md:text-base text-slate-600 max-w-xl">
                TCG Deal Finder scores every live eBay listing by discount, seller
                trust, and data confidence so you only spend time on the safest
                opportunities.
              </p>
            </div>

            <div className="text-sm text-slate-600">
              <div>200+ live deals tracked</div>
              <div>40+ trusted sellers</div>
              <div>Fresh listings every day</div>
            </div>
          </div>
        </section>

        {/* All live deals */}
        <section>
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-4 py-4 md:px-6 md:py-5">
            <h2 className="text-lg font-semibold tracking-tight mb-1">
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

import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../../../lib/pricing";

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

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const pageParam = Number(searchParams.get("page"));
  const pageSizeParam = Number(searchParams.get("pageSize"));

  const pageSize = Math.min(
    Math.max(pageSizeParam || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(pageParam || 1, 1);
  const offset = (page - 1) * pageSize;

  const totalRes = await query<{ count: string }>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM listings l
      WHERE
        l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.match_eligible = TRUE;
    `,
  );
  const totalCount = Number(totalRes.rows[0]?.count ?? 0);

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
      LIMIT $1 OFFSET $2;
    `,
    [pageSize, offset],
  );

  const deals = res.rows.map((row) => {
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
      condition: row.card_condition_bucket ?? null,
      setName: row.card_set_name ?? null,
      cardName: row.card_name ?? null,
      sampleSize,
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
    };
  });

  return NextResponse.json({ deals, totalCount });
}

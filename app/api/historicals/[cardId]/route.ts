import { NextRequest, NextResponse } from "next/server";

import { query } from "../../../../lib/db";

const MAX_HISTORY_DAYS = 365;

interface HistoricalRow {
  price_date: string;
  median_price: string | null;
  sample_size: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId: rawCardId } = await params;
  const cardId = Number(rawCardId);

  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const res = await query<HistoricalRow>(
    `
      SELECT
        date_trunc('day', sold_at)::date AS price_date,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
        COUNT(*) AS sample_size
      FROM ebay_sold_listings
      WHERE card_id = $1
        AND sold_at IS NOT NULL
        AND price IS NOT NULL
        AND price > 0
        AND sold_at >= NOW() - INTERVAL '${MAX_HISTORY_DAYS} days'
      GROUP BY price_date
      ORDER BY price_date ASC
      LIMIT ${MAX_HISTORY_DAYS};
    `,
    [cardId]
  );

  const points = res.rows
    .map((row) => {
      const median = row.median_price != null ? Number(row.median_price) : null;
      const sample = row.sample_size != null ? Number(row.sample_size) : null;

      if (
        median == null ||
        !Number.isFinite(median) ||
        sample == null ||
        !Number.isFinite(sample)
      ) {
        return null;
      }

      return {
        date: row.price_date,
        median,
        sample,
      };
    })
    .filter(
      (point): point is { date: string; median: number; sample: number } =>
        point !== null
    );

  return NextResponse.json(points);
}

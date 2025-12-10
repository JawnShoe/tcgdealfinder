import { NextRequest, NextResponse } from "next/server";

import { query } from "../../../lib/db";

type WatchlistCardRow = {
  id: number;
  name: string;
  set_name: string;
  card_number: string | null;
  condition_bucket: string;
  median_price_cad: string | null;
  sample_size: number | null;
};

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ cards: [] });
  }

  const ids = idsParam
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id));

  if (ids.length === 0) {
    return NextResponse.json({ cards: [] });
  }

  const uniqueIds = Array.from(new Set(ids)).slice(0, 50);

  const res = await query<WatchlistCardRow>(
    `
      SELECT
        c.id,
        c.name,
        c.set_name,
        c.card_number,
        c.condition_bucket,
        hp.median_price_cad,
        hp.sample_size
      FROM cards c
      LEFT JOIN historical_prices hp ON hp.card_id = c.id
      WHERE c.id = ANY($1)
    `,
    [uniqueIds],
  );

  const cards = res.rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      setName: row.set_name,
      cardNumber: row.card_number,
      condition: row.condition_bucket,
      estimatedValue:
        row.median_price_cad != null ? Number(row.median_price_cad) : null,
      sampleSize:
        row.sample_size != null ? Number(row.sample_size) : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ cards });
}

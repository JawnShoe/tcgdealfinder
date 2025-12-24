"use server";

import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { checkDebugAuth } from "@/lib/debugAuth";
import {
  ensureListingsIntegrityColumns,
  LISTINGS_INTEGRITY_MISSING_MESSAGE,
} from "@/lib/schema";
import { normalizeSellerStoreName } from "@/lib/sellerDisplay";

type IntegrityRow = {
  id: number;
  listing_id: string;
  title: string;
  url: string;
  market: string;
  total_price_cad: string | null;
  historic_price_cad: string | null;
  integrity_status: string;
  integrity_reason: string | null;
  integrity_score: number | null;
  card_id: number | null;
  card_name: string | null;
  card_set_name: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  override_type: string | null;
  seller_username: string | null;
  seller_store_name: string | null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const hasIntegrityColumns = await ensureListingsIntegrityColumns();
  if (!hasIntegrityColumns) {
    return NextResponse.json(
      { error: LISTINGS_INTEGRITY_MISSING_MESSAGE },
      { status: 500 },
    );
  }
  const params: Record<string, string | string[] | undefined> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const auth = checkDebugAuth(params);
  if (!auth.valid) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const defaultSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sinceDate = sinceParam ? new Date(sinceParam) : defaultSince;
  const limit = limitParam ? Math.min(500, Math.max(1, Number(limitParam))) : 200;

  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid since parameter" },
      { status: 400 },
    );
  }

  const rows = await query<IntegrityRow>(
    `
      SELECT
        l.id,
        l.listing_id,
        l.title,
        l.url,
        l.market,
        l.total_price_cad,
        l.historic_price_cad,
        l.integrity_status,
        l.integrity_reason,
        l.integrity_score,
        l.card_id,
        c.name AS card_name,
        c.set_name AS card_set_name,
        l.created_at,
        l.updated_at,
        lo.override_type,
        l.seller_username,
        l.seller_store_name
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
      LEFT JOIN listing_overrides lo ON lo.listing_id = l.listing_id
      WHERE
        l.integrity_status = 'REVIEW'
        AND l.updated_at >= $1
      ORDER BY l.updated_at DESC
      LIMIT $2;
    `,
    [sinceDate, limit],
  );

  const listings = rows.rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    title: row.title,
    url: row.url,
    market: row.market,
    totalPriceCad:
      row.total_price_cad != null ? Number(row.total_price_cad) : null,
    historicPriceCad:
      row.historic_price_cad != null ? Number(row.historic_price_cad) : null,
    integrityStatus: row.integrity_status,
    integrityReason: row.integrity_reason,
    integrityScore:
      row.integrity_score != null ? Number(row.integrity_score) : null,
    cardId: row.card_id,
    cardName: row.card_name,
    cardSetName: row.card_set_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    overrideType: row.override_type,
    sellerUsername: row.seller_username,
    sellerStoreName: normalizeSellerStoreName(row.seller_store_name),
  }));

  return NextResponse.json({
    listings,
    count: listings.length,
  });
}

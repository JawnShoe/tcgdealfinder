import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

const LISTING_ID_PATTERN = /^v1\|\d+\|0$/;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawItemId = searchParams.get("itemId");
  if (!rawItemId) {
    return NextResponse.json(
      { error: "Missing itemId parameter" },
      { status: 400 },
    );
  }

  const normalizedId = normalizeListingId(rawItemId);
  if (!normalizedId) {
    return NextResponse.json(
      { error: "Invalid eBay item id or URL" },
      { status: 400 },
    );
  }

  const row = await query<{
    id: number;
    listing_id: string;
    title: string;
    url: string;
    total_price_cad: string | null;
    market: string;
    seller_username: string | null;
  }>(
    `
      SELECT
        l.id,
        l.listing_id,
        l.title,
        l.url,
        l.total_price_cad,
        l.market,
        l.seller_username
      FROM listings l
      WHERE l.listing_id = $1
      LIMIT 1;
    `,
    [normalizedId],
  );

  const match = row.rows[0];
  if (!match) {
    return NextResponse.json(
      { found: false, message: "Not in our database yet. Try again after the next refresh cycle." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    found: true,
    listing: {
      id: match.id,
      listingId: match.listing_id,
      title: match.title,
      url: match.url,
      market: match.market,
      sellerUsername: match.seller_username,
      totalPriceCad:
        match.total_price_cad != null ? Number(match.total_price_cad) : null,
    },
  });
}

function normalizeListingId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const directNumeric = trimmed.match(/^\d{9,}$/);
  if (directNumeric) {
    return `v1|${directNumeric[0]}|0`;
  }
  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(/\/itm\/(\d{9,})/);
    if (pathMatch) {
      return `v1|${pathMatch[1]}|0`;
    }
  } catch {
    // not a URL, ignore
  }

  if (LISTING_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return null;
}

import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { ensureListingsMarketColumn } from "@/lib/schema";
import { DEFAULT_MARKET } from "@/lib/markets";

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

  const hasMarketColumn = await ensureListingsMarketColumn();
  const marketSelect = hasMarketColumn
    ? "l.market"
    : `'${DEFAULT_MARKET}'::text`;

  const row = await query<{
    id: number;
    listing_id: string;
    title: string;
    url: string;
    total_price_cad: string | null;
    shipping_cad: string | null;
    market: string;
    seller_username: string | null;
    match_eligible: boolean;
    match_reject_reason: string | null;
    reject_source: string | null;
    reject_detail: string | null;
    shipping_known: boolean;
    shipping_source: string | null;
    collector_number_raw: string | null;
    collector_number_norm: string | null;
    collector_number_confidence: string | null;
    collector_number_signals: string[] | null;
    card_collector_number_norm: string | null;
    card_collector_number_confidence: string | null;
  }>(
    `
      SELECT
        l.id,
        l.listing_id,
        l.title,
        l.url,
        l.total_price_cad,
        l.shipping_cad,
        ${marketSelect} AS market,
        l.seller_username,
        l.match_eligible,
        l.match_reject_reason,
        l.reject_source,
        l.reject_detail,
        l.shipping_known,
        l.shipping_source,
        l.collector_number_raw,
        l.collector_number_norm,
        l.collector_number_confidence,
        l.collector_number_signals,
        c.collector_number_norm AS card_collector_number_norm,
        c.collector_number_confidence AS card_collector_number_confidence
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
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
      matchEligible: match.match_eligible,
      matchRejectReason: match.match_reject_reason,
      rejectSource: match.reject_source,
      rejectDetail: match.reject_detail,
      shippingKnown: match.shipping_known,
      shippingCad: match.shipping_cad != null ? Number(match.shipping_cad) : null,
      shippingSource: match.shipping_source,
      collectorNumber: {
        raw: match.collector_number_raw,
        norm: match.collector_number_norm,
        confidence: (match.collector_number_confidence as any) ?? "NONE",
        signals: match.collector_number_signals ?? [],
      },
      cardCollectorNumber: {
        norm: match.card_collector_number_norm,
        confidence: (match.card_collector_number_confidence as any) ?? null,
      },
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

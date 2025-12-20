import { query } from "@/lib/db";
import {
  shouldExcludeListingFromCardSurfaces,
  type CardContext,
} from "@/lib/blacklist";
import { normalizeSellerStoreName } from "@/lib/sellerDisplay";

export type TimeframePreset = "1h" | "6h" | "24h" | "3d" | "7d" | "30d";

export type ExcludedListing = {
  id: number;
  listingId: string;
  title: string;
  url: string;
  market: string;
  priceCad: number | null;
  shippingCad: number | null;
  totalPriceCad: number | null;
  sellerUsername: string | null;
  seller: string | null;
  sellerStoreName: string | null;
  sellerBlacklisted: boolean;
  createdAt: Date | null;
  endsAt: Date | null;
  cardId: number | null;
  cardName: string | null;
  cardSetName: string | null;
  cardNumber: string | null;
  cardRarity: string | null;
  exclusionKind: "hard" | "soft";
  exclusionReason: string;
  exclusionHit: string | null;
};

export type ExclusionStats = {
  totalScanned: number;
  totalExcluded: number;
  hardCount: number;
  softCount: number;
  topHardHits: Array<{ hit: string; count: number }>;
  topSoftHits: Array<{ hit: string; count: number }>;
};

type ListingRow = {
  id: number;
  listing_id: string;
  title: string;
  url: string;
  market: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  seller_username: string | null;
  seller: string | null;
  seller_store_name: string | null;
  seller_blacklisted: boolean;
  created_at: Date | null;
  ends_at: Date | null;
  card_id: number | null;
  card_name: string | null;
  card_set_name: string | null;
  card_number: string | null;
  card_rarity: string | null;
};

const TIMEFRAME_HOURS: Record<TimeframePreset, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "30d": 720,
};

export function parseTimeframe(searchParams: Record<string, string | string[] | undefined>): {
  hours: number;
  label: string;
} {
  const sinceHoursRaw = Array.isArray(searchParams.sinceHours)
    ? searchParams.sinceHours[0]
    : searchParams.sinceHours;

  if (sinceHoursRaw) {
    const parsed = parseInt(sinceHoursRaw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(720, parsed));
      return { hours: clamped, label: `${clamped}h (custom)` };
    }
  }

  const sinceRaw = Array.isArray(searchParams.since)
    ? searchParams.since[0]
    : searchParams.since;

  const timeframeRaw = Array.isArray(searchParams.timeframe)
    ? searchParams.timeframe[0]
    : searchParams.timeframe;

  const preset = (sinceRaw ?? timeframeRaw) as TimeframePreset;
  if (preset && TIMEFRAME_HOURS[preset]) {
    return { hours: TIMEFRAME_HOURS[preset], label: preset };
  }

  return { hours: 24, label: "24h" };
}

export function parseKind(
  searchParams: Record<string, string | string[] | undefined>,
): "all" | "hard" | "soft" {
  const kindRaw = Array.isArray(searchParams.kind)
    ? searchParams.kind[0]
    : searchParams.kind;

  if (kindRaw === "hard" || kindRaw === "soft") {
    return kindRaw;
  }
  return "all";
}

export function parseLimit(
  searchParams: Record<string, string | string[] | undefined>,
): number {
  const limitRaw = Array.isArray(searchParams.limit)
    ? searchParams.limit[0]
    : searchParams.limit;

  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (!isNaN(parsed)) {
      return Math.max(10, Math.min(1000, parsed));
    }
  }
  return 200;
}

export async function fetchRecentListings(
  hours: number,
  limit: number,
): Promise<ListingRow[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const internalLimit = Math.min(limit * 5, 5000);

  const result = await query<ListingRow>(
    `SELECT 
      l.id,
      l.listing_id,
      l.title,
      l.url,
      l.market,
      l.price_cad,
      l.shipping_cad,
      l.total_price_cad,
      l.seller_username,
      l.seller,
      l.seller_store_name,
      (sb.seller_username IS NOT NULL) AS seller_blacklisted,
      l.created_at,
      l.ends_at,
      l.card_id,
      c.name AS card_name,
      c.set_name AS card_set_name,
      c.card_number AS card_number,
      NULL::TEXT AS card_rarity
    FROM listings l
    LEFT JOIN cards c ON l.card_id = c.id
    LEFT JOIN seller_blacklist sb ON sb.seller_username = l.seller_username
    WHERE l.created_at >= $1
    ORDER BY l.created_at DESC
    LIMIT $2`,
    [cutoff, internalLimit],
  );

  return result.rows;
}

export async function processExclusions(
  rows: ListingRow[],
  kindFilter: "all" | "hard" | "soft",
  limit: number,
): Promise<{ excluded: ExcludedListing[]; stats: ExclusionStats }> {
  const excluded: ExcludedListing[] = [];
  const hardHits: Record<string, number> = {};
  const softHits: Record<string, number> = {};
  let hardCount = 0;
  let softCount = 0;

  for (const row of rows) {
    const cardContext: CardContext | undefined = row.card_id
      ? {
          name: row.card_name,
          setName: row.card_set_name,
          number: row.card_number,
          rarity: row.card_rarity,
        }
      : undefined;

    const result = await shouldExcludeListingFromCardSurfaces(
      { title: row.title, listingId: row.listing_id },
      cardContext,
    );

    if (!result.excluded) {
      continue;
    }

    const kind = result.hardBlocked ? "hard" : "soft";
    if (kind === "hard") {
      hardCount++;
      if (result.hit) {
        hardHits[result.hit] = (hardHits[result.hit] ?? 0) + 1;
      }
    } else {
      softCount++;
      if (result.hit) {
        softHits[result.hit] = (softHits[result.hit] ?? 0) + 1;
      }
    }

    if (kindFilter !== "all" && kindFilter !== kind) {
      continue;
    }

    if (excluded.length < limit) {
      excluded.push({
        id: row.id,
        listingId: row.listing_id,
        title: row.title,
        url: row.url,
        market: row.market,
        priceCad: row.price_cad ? parseFloat(row.price_cad) : null,
        shippingCad: row.shipping_cad ? parseFloat(row.shipping_cad) : null,
        totalPriceCad: row.total_price_cad ? parseFloat(row.total_price_cad) : null,
        sellerUsername: row.seller_username,
        seller: row.seller,
        sellerStoreName: normalizeSellerStoreName(row.seller_store_name),
        sellerBlacklisted: Boolean(row.seller_blacklisted),
        createdAt: row.created_at,
        endsAt: row.ends_at,
        cardId: row.card_id,
        cardName: row.card_name,
        cardSetName: row.card_set_name,
        cardNumber: row.card_number,
        cardRarity: row.card_rarity,
        exclusionKind: kind,
        exclusionReason: result.reason ?? "unknown",
        exclusionHit: result.hit ?? null,
      });
    }
  }

  const topHardHits = Object.entries(hardHits)
    .map(([hit, count]) => ({ hit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSoftHits = Object.entries(softHits)
    .map(([hit, count]) => ({ hit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    excluded,
    stats: {
      totalScanned: rows.length,
      totalExcluded: hardCount + softCount,
      hardCount,
      softCount,
      topHardHits,
      topSoftHits,
    },
  };
}

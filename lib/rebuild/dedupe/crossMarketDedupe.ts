import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";

export type DedupeResult = {
  deduped: ListingDomain[];
  duplicates: Map<string, ListingDomain[]>;
};

export function normalizeListingKey(listing: ListingDomain): string {
  const listingId = listing.listingId.trim();
  if (listingId) {
    return `listing:${listingId}`;
  }

  const urlKey = normalizeUrlKey(listing.url);
  if (urlKey) {
    return `url:${urlKey}`;
  }

  return `fallback:${buildFallbackKey(listing)}`;
}

export function dedupeDeals(deals: ListingDomain[]): DedupeResult {
  const deduped: ListingDomain[] = [];
  const duplicates = new Map<string, ListingDomain[]>();
  const seen = new Map<string, ListingDomain>();

  for (const deal of deals) {
    const key = normalizeListingKey(deal);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, deal);
      deduped.push(deal);
      continue;
    }

    const group = duplicates.get(key);
    if (group) {
      group.push(deal);
    } else {
      duplicates.set(key, [existing, deal]);
    }
  }

  return { deduped, duplicates };
}

function normalizeUrlKey(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    let pathname = parsed.pathname || "/";
    if (pathname !== "/") {
      pathname = pathname.replace(/\/+$/, "");
    }
    return `${protocol}//${hostname}${pathname}`;
  } catch {
    const stripped = url.split(/[?#]/)[0]?.trim();
    return stripped || null;
  }
}

function buildFallbackKey(listing: ListingDomain): string {
  const seller = (listing.seller.username ?? listing.seller.name ?? "unknown")
    .trim()
    .toLowerCase();
  const title = listing.title.trim().toLowerCase();
  const amount =
    listing.price.amount ?? listing.price.totalUsd ?? listing.price.totalNative;
  const currency = listing.price.currency ?? "unknown";
  const priceKey =
    amount == null ? `unknown:${currency}` : `${amount}:${currency}`;

  return `${seller}|${title}|${priceKey}`;
}

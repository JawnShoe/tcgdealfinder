"use server";

import type { MarketCode } from "../../markets";
import { getAppAccessToken } from "../../ebay";

export type StorefrontSource = "api" | "override";

export type StorefrontInfo = {
  storeName: string;
  storeUrl: string | null;
  source: StorefrontSource;
};

/**
 * DEPRECATED: Shopping API is disabled due to aggressive IP rate limits.
 *
 * The Shopping API (GetSingleItem) has much stricter rate limits than Browse API,
 * causing "IP limit exceeded" errors during bulk ingestion. Store name enrichment
 * is non-critical metadata and should not block listing ingestion.
 *
 * This flag disables all Shopping API calls. Set to false only for debugging
 * or if eBay increases rate limits in the future.
 *
 * See: https://developer.ebay.com/support/kb-article?KBid=5305
 */
const SHOPPING_API_DISABLED = true;

const SHOPPING_ENDPOINT = "https://open.api.ebay.com/shopping";
const DEFAULT_SITE_ID = 0; // eBay US
const SITE_ID_MAP: Partial<Record<MarketCode, number>> = {
  EBAY_US: 0,
  EBAY_CA: 2,
  EBAY_GB: 3,
  EBAY_AU: 15,
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const MIN_INTERVAL_MS = 400; // ~2.5 req/sec global cap

type CacheEntry = {
  expiresAt: number;
  value: StorefrontInfo | null;
};

const storefrontCache = new Map<string, CacheEntry>();
let lastRequestAt = 0;

const SELLER_OVERRIDES: Record<string, StorefrontInfo> = {
  andre17: {
    storeName: "brazil shop",
    storeUrl: "https://www.ebay.com/usr/andre17",
    source: "api",
  },
};

function getSiteId(market?: MarketCode): number {
  if (!market) return DEFAULT_SITE_ID;
  return SITE_ID_MAP[market] ?? DEFAULT_SITE_ID;
}

function buildCacheKey(itemId: string, market?: MarketCode): string {
  return `${itemId}:${market ?? "any"}`;
}

function extractNumericItemId(listingId: string): string {
  if (!listingId) return "";
  const parts = listingId.split("|");
  if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
    return parts[1];
  }
  const numeric = listingId.match(/\d+/g)?.join("") ?? "";
  return numeric;
}

async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_INTERVAL_MS - elapsed)
    );
  }
  lastRequestAt = Date.now();
}

function normalizeStoreName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

type ShoppingResponse = {
  Ack?: string;
  Item?: {
    Storefront?: {
      StoreName?: string;
      StoreURL?: string;
    };
    Seller?: {
      StoreName?: string;
      SellerInfo?: {
        StoreName?: string;
        StoreURL?: string;
      };
    };
  };
  Errors?: Array<{ ShortMessage?: string; LongMessage?: string }>;
};

export function extractItemId(listingId: string): string {
  return extractNumericItemId(listingId);
}

export async function fetchStorefrontInfo(
  listingId: string,
  market?: MarketCode,
  sellerUsername?: string | null
): Promise<StorefrontInfo | null> {
  // Check for seller overrides first (works even when API is disabled)
  if (sellerUsername && SELLER_OVERRIDES[sellerUsername]) {
    return { ...SELLER_OVERRIDES[sellerUsername], source: "override" };
  }

  // Shopping API is disabled due to rate limits - return null for all other cases
  if (SHOPPING_API_DISABLED) {
    return null;
  }

  const itemId = extractNumericItemId(listingId);
  if (!itemId) {
    return null;
  }
  const cacheKey = buildCacheKey(itemId, market);
  const cached = storefrontCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const appId =
    process.env.EBAY_APP_ID ??
    process.env.EBAY_CLIENT_ID ??
    process.env.NEXT_PUBLIC_EBAY_APP_ID ??
    null;
  if (!appId) {
    console.warn("[storefront] Missing EBAY_APP_ID env; skipping enrichment.");
    return null;
  }

  await rateLimitDelay();

  const params = new URLSearchParams({
    callname: "GetSingleItem",
    responseencoding: "JSON",
    requestencoding: "NV",
    appid: appId,
    siteid: String(getSiteId(market)),
    "GLOBAL-ID": market ? market.replace("EBAY_", "EBAY-") : "EBAY-US",
    version: "967",
    IncludeSelector: "SellerInfo,StoreInfo",
    ItemID: itemId,
  });

  try {
    const iafToken = await getAppAccessToken();
    const response = await fetch(`${SHOPPING_ENDPOINT}?${params.toString()}`, {
      headers: {
        "X-EBAY-API-APP-ID": appId,
        "SECURITY-APPNAME": appId,
        "X-EBAY-API-VERSION": "967",
        Accept: "application/json",
        "X-EBAY-API-IAF-TOKEN": iafToken,
        "X-EBAY-SOA-SERVICE-NAME": "ShoppingService",
        "X-EBAY-SOA-OPERATION-NAME": "GetSingleItem",
        "X-EBAY-SOA-SECURITY-APPNAME": appId,
        "X-EBAY-SOA-REQUEST-DATA-FORMAT": "NV",
        "X-EBAY-SOA-RESPONSE-DATA-FORMAT": "JSON",
        "X-EBAY-SOA-IAF-TOKEN": iafToken,
      },
    });

    if (!response.ok) {
      console.warn(
        `[storefront] Shopping API ${response.status} for item ${itemId}`
      );
      const fallbackValue =
        (sellerUsername && SELLER_OVERRIDES[sellerUsername]) || null;
      storefrontCache.set(cacheKey, {
        value: fallbackValue,
        expiresAt: Date.now() + 1000 * 60 * 10,
      });
      return fallbackValue;
    }

    const payload = (await response.json()) as ShoppingResponse;
    if (payload.Ack && payload.Ack !== "Success" && payload.Ack !== "Warning") {
      const errorText = payload.Errors?.map(
        (err) => err.ShortMessage ?? err.LongMessage ?? "unknown"
      ).join(" | ");
      console.warn(
        `[storefront] Shopping API ack=${payload.Ack} for item ${itemId} ${errorText ? `(${errorText})` : ""}`
      );
    }

    const storefront = payload.Item?.Storefront;
    const fallbackSeller = payload.Item?.Seller;
    const storeName =
      normalizeStoreName(storefront?.StoreName) ??
      normalizeStoreName(fallbackSeller?.StoreName) ??
      normalizeStoreName(fallbackSeller?.SellerInfo?.StoreName);

    const storeUrl =
      storefront?.StoreURL ?? fallbackSeller?.SellerInfo?.StoreURL ?? null;

    const result: StorefrontInfo | null = storeName
      ? {
          storeName,
          storeUrl,
          source: "api",
        }
      : null;

    const finalValue =
      result ?? (sellerUsername && SELLER_OVERRIDES[sellerUsername]) ?? null;

    storefrontCache.set(cacheKey, {
      value: finalValue,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return finalValue;
  } catch (error) {
    console.error(
      `[storefront] Failed to fetch store for ${itemId}: ${
        (error as Error).message
      }`
    );
    const fallbackValue =
      (sellerUsername && SELLER_OVERRIDES[sellerUsername]) ?? null;
    storefrontCache.set(cacheKey, {
      value: fallbackValue,
      expiresAt: Date.now() + 1000 * 60 * 5,
    });
    return fallbackValue;
  }
}

import type { MarketCode } from "./markets";
import { fetchWithRateLimitRetry } from "./rateLimitRetry"; // lib/ebay.ts

//
// eBay integration using the modern Buy/Browse API.
// - Search: /buy/browse/v1/item_summary/search
// - Auth: OAuth2 client_credentials with EBAY_CLIENT_ID / EBAY_CLIENT_SECRET
//
// This replaces any old Finding API usage. scripts/update-listings.ts
// should continue to call fetchEbayListings(searchQuery, market).

export type NormalizedListing = {
  source: string; // "EBAY"
  listingId: string;
  title: string;
  url: string;
  imageUrl?: string;
  localizedAspects?: Array<{ name?: string; value?: string }>;
  priceCad: number;
  priceCurrency?: string | null;
  shippingCad: number | null;
  shippingCurrency?: string | null;
  totalPriceCad: number | null;
  shippingKnown?: boolean;
  shippingSource?: string | null;
  seller?: string;
  sellerFeedbackCount?: number | null;
  sellerPositivePercent?: number | null;
  sellerUsername?: string | null;
  sellerStoreName?: string | null;
  conditionRaw?: string | null;
  market: MarketCode; // e.g. "EBAY_US"
  endsAt?: string | null;
};

export type EbayItemDetail = {
  conditionDescriptors?: Array<{
    name?: string;
    values?: Array<{ content?: string }>;
  }>;
  localizedAspects?: Array<{
    name?: string;
    value?: string;
  }>;
};

export type SoldListing = {
  listingId?: string;
  title: string;
  priceCad: number;
  soldAt?: string | null;
  raw: unknown;
};

type EbayEnv = {
  appId: string;
  clientId: string;
  clientSecret: string;
};

export const BANNED_TITLE_KEYWORDS = [
  // ===== JUMBO/OVERSIZE =====
  // NOTE: "full art" and "alt art" are LEGITIMATE Pokémon TCG card types, do NOT block!
  "jumbo",
  "jumbo card",
  "oversize",
  "oversized",
  "giant card",

  // ===== PROXY/REPLICA =====
  "proxy",
  "proxi",
  "proxies",
  "proxy card",
  "replica",
  "repro",
  "reproduction",
  "remake",
  "bootleg",
  "counterfeit",
  "fake card",
  "not real",
  "not a real",
  "not authentic",
  "not official",
  "non official",
  "unofficial",
  // International replica terms
  "carta replica",
  "replica carta",
  "carta prox",
  "falsa",
  "imitazione",
  "imitacion",
  "falso",
  "contrefacon",
  "faux",

  // ===== CUSTOM/FAN MADE =====
  // NOTE: "art card" alone removed - too many false positives with "Alt Art Card" which is legitimate
  "fan art",
  "fanart",
  "custom art",
  "custom artwork",
  "fan-made",
  "fan made",
  "fanmade",
  "custom made",
  "customized",
  "custom-designed",
  "custom design",
  "custom print",
  "custom card",
  "custom pokemon",
  "made to order",
  "handmade",
  "hand made",
  "hand-crafted",
  "handcrafted",
  "art extender",
  "extended art custom",
  "altered art",
  "proxy art",

  // ===== NON-CARD MATERIALS =====
  "custom metal",
  "custom metal card",
  "custom pokemon card",
  "metal card",
  "metal art",
  "metal pokemon card",
  "metal pokemon",
  "rainbow metal",
  "brushed metal",
  "stainless steel",
  "stainless",
  "chrome card",
  "chromium card",
  "full metal",
  "acrylic",
  "acrylic card",
  "aluminum",
  "aluminium",
  "alloy",
  "gold metal",
  "silver metal",
  "brass",
  "copper card",
  "iron card",
  "tin card",
  "steel card",
  "etched",
  "etched card",
  "etched metal",
  "laser engraved",
  "engraved",
  "gold plated",
  "gold-plated",
  "silver plated",
  "textured",
  "textured gold",
  "gold foil",
  "silver foil",
  "rainbow foil",
  "foil art",

  // ===== DISPLAY/ACCESSORIES =====
  "display only",
  "for display",
  "display case",
  "display stand",
  "display holder",
  "card case",
  "card holder",
  "card stand",
  "card frame",
  "slab case",
  "slab holder",
  "slab stand",
  "magnetic holder",
  "magnetic case",
  "one touch",
  "one-touch",
  "toploader",
  "top loader",
  "card sleeve",
  "penny sleeve",
  "card protector",
  "protective case",
  "binder",
  "album",
  "storage box",
  "storage case",
  "deck box",
  "portfolio",
  "with stand",
  "with case",
  "with holder",
  "with display",
  "with frame",
  "includes case",
  "includes stand",
  "includes holder",

  // ===== NOT ACTUAL CARDS =====
  "for collection only",
  "print only",
  "printed card",
  "printed",
  "high-quality print",
  "high quality print",
  "collector print",
  "reprint",
  "reprinted",
  "sticker",
  "decal",
  "blank card",
  "diy card",
  "template card",
  "png",
  "svg",
  "digital file",
  "digital download",
  "poster",
  "art print",
  "illustration",
  "wall art",
  "canvas",

  // ===== LOTS/BUNDLES/SEALED =====
  "lot",
  "bulk",
  "lot of",
  "card lot",
  "pokemon lot",
  "bulk lot",
  "collection lot",
  "bundle of",
  "bulk cards",
  "bulk collection",
  "job lot",
  "wholesale",
  "mixed lot",
  "random lot",
  "mystery box",
  "booster",
  "booster pack",
  "booster box",
  "sealed pack",
  "sealed box",
  "sealed case",
  "elite trainer box",
  "etb sealed",
  "blister pack",
  "tin sealed",
  "sealed tin",

  // ===== CODES/DIGITAL =====
  "online code",
  "ptcgo",
  "digital code",

  // ===== LANGUAGE EXCLUSIONS =====
  "korean",

  // ===== MISC BANNED =====
  "330hp",
  "hp330",
  "rainbow fan art",
  "playmat",
];

const CONDITION_BUCKETS = new Set(["raw_nm", "nm", "lp", "mp", "hp", "dmg"]);

const CONDITION_MAP: Record<string, string> = {
  valutata: "raw_nm",
  "come nuovo": "nm",
  "como nuevo": "nm",
  "sehr gut": "nm",
  "ottime condizioni": "lp",
  "muy bueno": "lp",
  "very good": "lp",
  "buone condizioni": "mp",
  bueno: "mp",
  gebraucht: "mp",
  accettabile: "hp",
  acceptable: "hp",
  used: "hp",
};

export function cleanTitle(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeCondition(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const c = raw.toLowerCase().trim();
  const includes = (needle: string) => c.includes(needle);

  if (
    includes("ungraded") ||
    includes("non graded") ||
    includes("not graded") ||
    includes("no grade") ||
    includes("non psa") ||
    includes("non bgs") ||
    includes("non cgc")
  ) {
    return "raw_nm";
  }

  if (
    includes("near mint") ||
    c === "nm" ||
    includes("nm/m") ||
    includes("mint") ||
    includes("pack fresh") ||
    includes("come nuovo") ||
    includes("quasi nuovo") ||
    includes("como nuevo") ||
    includes("casi nuevo") ||
    includes("nahezu neu") ||
    includes("fast neu") ||
    includes("sehr gut") ||
    includes("comme neuf") ||
    includes("presque neuf") ||
    includes("como novo")
  ) {
    return "nm";
  }

  if (
    includes("lightly played") ||
    includes("light play") ||
    c === "lp" ||
    includes("ottime condizioni") ||
    includes("leggermente giocata") ||
    includes("excelente estado") ||
    includes("ligeramente jugado") ||
    includes("leicht gespielt") ||
    includes("sehr guter zustand") ||
    includes("très bon état") ||
    includes("pouco usado")
  ) {
    return "lp";
  }

  if (
    includes("moderately played") ||
    includes("mod play") ||
    c === "mp" ||
    includes("good condition") ||
    includes("buone condizioni") ||
    includes("abbastanza giocata") ||
    includes("buen estado") ||
    includes("estado bueno") ||
    includes("gut erhalten") ||
    (includes("gebraucht") && !includes("stark")) ||
    includes("bon état") ||
    includes("bom estado")
  ) {
    return "mp";
  }

  if (
    includes("heavily played") ||
    includes("heavy play") ||
    c === "hp" ||
    includes("well played") ||
    includes("used condition") ||
    includes("acceptable") ||
    includes("condizioni accettabili") ||
    includes("molto giocata") ||
    includes("muy jugado") ||
    includes("estado aceptable") ||
    includes("stark gespielt") ||
    includes("stark benutzt") ||
    includes("état moyen") ||
    includes("état acceptable") ||
    includes("muito usado") ||
    includes("estado razoável")
  ) {
    return "hp";
  }

  if (
    includes("damaged") ||
    includes("damage") ||
    includes("poor") ||
    includes("creased") ||
    includes("bent") ||
    includes("inked") ||
    includes("water damage") ||
    includes("heavy creases") ||
    includes("danneggiata") ||
    includes("dañado") ||
    includes("mal estado") ||
    includes("beschädigt") ||
    includes("abîmé") ||
    includes("endommagé") ||
    includes("danificado")
  ) {
    return "dmg";
  }

  if (CONDITION_BUCKETS.has(c)) {
    return c;
  }
  const snakeCase = c.replace(/\s+/g, "_");
  if (CONDITION_BUCKETS.has(snakeCase)) {
    return snakeCase;
  }
  return c;
}

export function findBannedTitleKeyword(rawTitle: string): string | null {
  const title = cleanTitle(rawTitle);
  for (const banned of BANNED_TITLE_KEYWORDS) {
    if (title.includes(banned)) {
      return banned;
    }
  }
  return null;
}

export function isValidListingTitle(rawTitle: string): boolean {
  return findBannedTitleKeyword(rawTitle) === null;
}

const MAX_STANDARD_SHIPPING_CAD = 40;
const HIGH_VALUE_PRICE_THRESHOLD = 800;
const MIN_PRICE_CAD = 0.99;

function getEbayEnv(): EbayEnv {
  const appId = process.env.EBAY_APP_ID;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!appId) {
    throw new Error("EBAY_APP_ID is not set in .env.local");
  }
  if (!clientId || !clientSecret) {
    throw new Error(
      "EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in .env.local"
    );
  }

  return { appId, clientId, clientSecret };
}

// Simple in-memory token cache so we don't request a new token on every call.
let cachedToken: {
  accessToken: string;
  expiresAt: number; // epoch seconds
} | null = null;

// ---- OAuth: get application access token for Browse API ----

export async function getAppAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getEbayEnv();

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.accessToken;
  }

  const tokenUrl = "https://api.ebay.com/identity/v1/oauth2/token";
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to get eBay app access token (${res.status} ${res.statusText}): ${text}`
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const expiresAt = now + (json.expires_in || 3600);

  cachedToken = {
    accessToken: json.access_token,
    expiresAt,
  };

  return json.access_token;
}

// Map our stored market code to the Browse Marketplace ID header.
function toMarketplaceId(market: string): string {
  switch (market) {
    case "EBAY_CA":
      return "EBAY_CA";
    case "EBAY_GB":
      return "EBAY_GB";
    case "EBAY_DE":
      return "EBAY_DE";
    case "EBAY_AU":
      return "EBAY_AU";
    case "EBAY_US":
    default:
      return "EBAY_US";
  }
}

// ---- Browse API search ----
// NOTE: Signature matches existing callers: fetchEbayListings(searchQuery, market)

export async function fetchEbayListings(
  searchQuery: string,
  market: MarketCode
): Promise<NormalizedListing[]> {
  const marketplaceId = toMarketplaceId(market);
  const accessToken = await getAppAccessToken();

  const baseUrl = "https://api.ebay.com/buy/browse/v1/item_summary/search";
  const url = new URL(baseUrl);

  // Use the actual query string from caller.
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("limit", "50");
  url.searchParams.set("sort", "price"); // we'll do deal logic later

  console.log(
    `fetchEbayListings: calling Browse API for "${searchQuery}" on ${marketplaceId}`
  );

  // Use rate limit retry wrapper for 429 responses
  const res = await fetchWithRateLimitRetry(() =>
    fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
      },
    })
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `fetchEbayListings: HTTP ${res.status} ${res.statusText}. Body (truncated):`,
      text.slice(0, 400)
    );
    return [];
  }

  const data = (await res.json()) as {
    itemSummaries?: Array<{
      itemId?: string;
      title?: string;
      itemWebUrl?: string;
      image?: { imageUrl?: string };
      localizedAspects?: Array<{ name?: string; value?: string }>;
      price?: { value?: string; currency?: string };
      shippingOptions?: Array<{
        shippingCost?: { value?: string; currency?: string };
      }>;
      seller?: {
        username?: string;
        feedbackScore?: number;
        feedbackPercentage?: string;
      };
      condition?: string;
      itemEndDate?: string;
      buyingOptions?: string[];
      bidCount?: number;
    }>;
  };

  const items = data.itemSummaries ?? [];
  console.log(
    `fetchEbayListings: received ${items.length} items from Browse API for "${searchQuery}".`
  );

  const listings: NormalizedListing[] = [];

  for (const item of items) {
    const listingId = item.itemId;
    const title = item.title;
    const urlStr = item.itemWebUrl;
    const localizedAspects = item.localizedAspects ?? [];

    if (!listingId || !title || !urlStr) {
      continue;
    }

    const priceCurrency = item.price?.currency
      ? String(item.price.currency).toUpperCase()
      : null;
    const priceValue = item.price?.value ? Number(item.price.value) : NaN;
    const shipValueRaw = item.shippingOptions?.[0]?.shippingCost?.value;
    const shippingCurrencyRaw =
      item.shippingOptions?.[0]?.shippingCost?.currency;
    let shippingKnown = true;
    let shippingCad: number | null = null;
    let shippingSource: string | null = null;
    if (shipValueRaw == null) {
      shippingKnown = false;
      shippingSource = "missing";
    } else {
      const parsedShipping = Number(shipValueRaw);
      if (Number.isFinite(parsedShipping)) {
        shippingCad = parsedShipping;
        shippingSource = "ebay";
      } else {
        shippingKnown = false;
        shippingSource = "invalid";
      }
    }

    if (!Number.isFinite(priceValue)) {
      // Skip weird items without a proper price.
      continue;
    }

    if (priceValue < MIN_PRICE_CAD) {
      continue;
    }

    if (!isValidListingTitle(title)) {
      continue;
    }

    const total =
      shippingKnown && shippingCad != null ? priceValue + shippingCad : null;

    const buyingOptions = item.buyingOptions ?? [];
    const isAuction = buyingOptions.includes("AUCTION");
    const isBin = buyingOptions.includes("FIXED_PRICE");
    const bidCount = item.bidCount ?? 0;

    if (isAuction && !isBin && (!Number.isFinite(bidCount) || bidCount <= 0)) {
      continue;
    }

    const isHighValue = priceValue >= HIGH_VALUE_PRICE_THRESHOLD;
    if (
      !isHighValue &&
      shippingCad != null &&
      shippingCad > MAX_STANDARD_SHIPPING_CAD
    ) {
      continue;
    }

    const sellerFeedbackCount =
      item.seller?.feedbackScore !== undefined
        ? Number(item.seller.feedbackScore)
        : null;
    const sellerPositivePercent =
      item.seller?.feedbackPercentage !== undefined
        ? Number(item.seller.feedbackPercentage)
        : null;
    const sellerUsername = item.seller?.username
      ? item.seller.username.toLowerCase()
      : null;

    // Store name if available (eBay Browse API doesn't return this in itemSummaries)
    // This field is prepared for future API enhancements or alternative endpoints
    const sellerStoreName: string | null = null;

    const normalizedCondition = normalizeCondition(item.condition);

    const base: NormalizedListing = {
      source: "EBAY",
      listingId: String(listingId),
      title: String(title),
      url: String(urlStr),
      imageUrl: item.image?.imageUrl,
      localizedAspects,
      priceCad: priceValue,
      priceCurrency,
      shippingCad,
      shippingCurrency: shippingCurrencyRaw
        ? String(shippingCurrencyRaw).toUpperCase()
        : null,
      totalPriceCad: total,
      shippingKnown,
      shippingSource,
      seller: item.seller?.username,
      sellerFeedbackCount,
      sellerPositivePercent,
      sellerUsername,
      sellerStoreName,
      conditionRaw: normalizedCondition,
      market,
      endsAt: item.itemEndDate ?? null,
    };

    // Add some alias fields to satisfy any older code that expects different names.
    const aliased: any = base;
    aliased.price = base.priceCad;
    aliased.shipping = base.shippingCad;
    aliased.total = base.totalPriceCad;
    aliased.price_cad = base.priceCad;
    aliased.shipping_cad = base.shippingCad;
    aliased.total_price_cad = base.totalPriceCad;
    aliased.seller_username = base.sellerUsername;

    listings.push(base);
  }

  console.log(
    `fetchEbayListings: normalized ${listings.length} listings for "${searchQuery}".`
  );

  const filtered = listings.filter((item) => {
    if (!item.title) return false;
    if (!isValidListingTitle(item.title)) return false;

    const price =
      item.totalPriceCad ??
      item.priceCad ??
      (item as any).total ??
      (item as any).price ??
      null;

    if (price == null || !Number.isFinite(price) || price <= 0) {
      return false;
    }

    return true;
  });

  return filtered;
}

export async function fetchEbayItemDetail(
  listingId: string,
  market: string
): Promise<EbayItemDetail | null> {
  const marketplaceId = toMarketplaceId(market);
  const accessToken = await getAppAccessToken();
  const endpoint = `https://api.ebay.com/buy/browse/v1/item/${listingId}`;

  try {
    // Use rate limit retry wrapper for 429 responses
    const res = await fetchWithRateLimitRetry(() =>
      fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        },
      })
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `fetchEbayItemDetail: HTTP ${res.status} ${res.statusText} for ${listingId}. Body (truncated):`,
        text.slice(0, 200)
      );
      return null;
    }

    return (await res.json()) as EbayItemDetail;
  } catch (error) {
    console.error(`fetchEbayItemDetail: failed for ${listingId}`, error);
    return null;
  }
}

function selfTestTitleFilter() {
  const cases: Array<{ title: string; expected: boolean }> = [
    {
      title: "Custom made Umbreon VMAX 215/203 metal card",
      expected: false,
    },
    {
      title: "Pokemon Umbreon VMAX 215/203 Alternate Art Mint",
      expected: true,
    },
  ];

  for (const test of cases) {
    const result = isValidListingTitle(test.title);
    if (result !== test.expected) {
      console.warn(
        `[lib/ebay] title filter self-test failed for "${test.title}" – expected ${test.expected}, got ${result}`
      );
    }
  }
}

selfTestTitleFilter();

export async function fetchEbaySoldListings(
  searchQuery: string,
  market: string,
  limit = 50
): Promise<SoldListing[]> {
  const marketplaceId = toMarketplaceId(market);
  const accessToken = await getAppAccessToken();

  const baseUrl = "https://api.ebay.com/buy/browse/v1/item_summary/search";
  const url = new URL(baseUrl);

  url.searchParams.set("q", searchQuery);
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("sort", "-endTime");
  url.searchParams.set("filter", "salesStatus:{SOLD}");

  console.log(
    `fetchEbaySoldListings: calling Browse API for "${searchQuery}" on ${marketplaceId}`
  );

  // Use rate limit retry wrapper for 429 responses
  const res = await fetchWithRateLimitRetry(() =>
    fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
      },
    })
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `fetchEbaySoldListings: HTTP ${res.status} ${res.statusText}. Body (truncated):`,
      text.slice(0, 400)
    );
    return [];
  }

  const data = (await res.json()) as {
    itemSummaries?: Array<{
      itemId?: string;
      title?: string;
      price?: { value?: string };
      itemEndDate?: string;
    }>;
  };

  const items = data.itemSummaries ?? [];
  console.log(
    `fetchEbaySoldListings: received ${items.length} sold items for "${searchQuery}".`
  );

  const soldListings: SoldListing[] = [];
  for (const item of items) {
    if (!item.title || !item.price?.value) {
      continue;
    }
    const priceValue = Number(item.price.value);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      continue;
    }
    soldListings.push({
      listingId: item.itemId,
      title: item.title,
      priceCad: priceValue,
      soldAt: item.itemEndDate ?? null,
      raw: item,
    });
  }

  return soldListings;
}

// ---- Rate-limit helper (Analytics API) ----

export async function getEbayRateLimits(): Promise<void> {
  const { clientId, clientSecret } = getEbayEnv();

  const tokenUrl = "https://api.ebay.com/identity/v1/oauth2/token";
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    throw new Error(
      `getEbayRateLimits: failed to get token (${tokenRes.status} ${tokenRes.statusText}): ${text}`
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
  };

  const accessToken = tokenJson.access_token;

  const limitsRes = await fetch(
    "https://api.ebay.com/analytics/v1/rate_limit/",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!limitsRes.ok) {
    const text = await limitsRes.text().catch(() => "");
    throw new Error(
      `getEbayRateLimits: failed to retrieve limits (${limitsRes.status} ${limitsRes.statusText}): ${text}`
    );
  }

  const limitsJson = await limitsRes.json();
  console.log(
    "getEbayRateLimits: raw response:",
    JSON.stringify(limitsJson, null, 2)
  );
}

/**
 * eBay Store Name Scraper
 * 
 * Extracts seller store names from eBay listing HTML pages.
 * Used to backfill seller_store_name field for better UI display.
 * 
 * IMPORTANT: This scrapes HTML and is inherently brittle.
 * - Treat as best-effort enrichment only
 * - Cache aggressively to minimize traffic
 * - Have graceful fallbacks
 * - Consider ToS implications
 */

export interface StoreNameResult {
  username: string | null;
  storeName: string | null;
  foundVia: string;
  success: boolean;
}

export interface ScraperOptions {
  userAgent?: string;
  timeoutMs?: number;
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Extract seller store name from an eBay listing page
 * 
 * @param itemId - eBay item ID (numeric string)
 * @param market - Market code (currently only EBAY_US supported)
 * @param options - Scraper options (user agent, timeout)
 * @returns StoreNameResult with username, storeName, and metadata
 */
export async function getStoreNameForItemId(
  itemId: string,
  market: string = "EBAY_US",
  options: ScraperOptions = {}
): Promise<StoreNameResult> {
  // Only support US market for now
  if (market !== "EBAY_US") {
    return {
      username: null,
      storeName: null,
      foundVia: `Unsupported market: ${market}`,
      success: false,
    };
  }

  const url = `https://www.ebay.com/itm/${itemId}`;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Special handling for common HTTP errors
      if (response.status === 404) {
        return {
          username: null,
          storeName: null,
          foundVia: "Listing not found (404)",
          success: false,
        };
      }
      if (response.status === 429) {
        return {
          username: null,
          storeName: null,
          foundVia: "Rate limited (429)",
          success: false,
        };
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract seller data using multiple strategies
    return extractSellerData(html);
  } catch (error: any) {
    // Handle fetch errors gracefully
    if (error.name === "AbortError") {
      return {
        username: null,
        storeName: null,
        foundVia: "Request timeout",
        success: false,
      };
    }

    console.error(`Error fetching store name for item ${itemId}:`, error.message);
    return {
      username: null,
      storeName: null,
      foundVia: `Error: ${error.message}`,
      success: false,
    };
  }
}

/**
 * Extract seller username and store name from HTML using multiple strategies
 */
function extractSellerData(html: string): StoreNameResult {
  // Strategy 1: JSON-LD structured data
  const jsonLdResult = tryJsonLd(html);
  if (jsonLdResult.success) return jsonLdResult;

  // Strategy 2: Extract from seller entity_id and _ssn fields (most reliable for eBay)
  const entityResult = tryEntityIdAndSsn(html);
  if (entityResult.success) return entityResult;

  // Strategy 3: window.__ embedded JSON data
  const windowDataResult = tryWindowData(html);
  if (windowDataResult.success) return windowDataResult;

  // Strategy 4: DOM selectors (fragile fallback)
  const domResult = tryDomSelectors(html);
  if (domResult.success) return domResult;

  return {
    username: null,
    storeName: null,
    foundVia: "All strategies failed",
    success: false,
  };
}

/**
 * Strategy 1: Try JSON-LD structured data
 */
function tryJsonLd(html: string): StoreNameResult {
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLdMatch) {
    return { username: null, storeName: null, foundVia: "No JSON-LD", success: false };
  }

  try {
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    const seller = jsonLd.seller || jsonLd["@graph"]?.find((n: any) => n["@type"] === "Person");

    if (seller?.name) {
      return {
        username: seller.identifier || seller.name,
        storeName: seller.name,
        foundVia: "JSON-LD",
        success: true,
      };
    }
  } catch (e) {
    // JSON parsing failed
  }

  return { username: null, storeName: null, foundVia: "JSON-LD parse failed", success: false };
}

/**
 * Strategy 2: Extract from entity_id (username) and _ssn (store name) fields
 * This is the most reliable pattern for modern eBay pages
 */
function tryEntityIdAndSsn(html: string): StoreNameResult {
  // Look for entity_id which contains the username
  const usernameMatch = html.match(/entity_id["']\s*:\s*["']~?([^"']+)["']/);
  if (!usernameMatch) {
    return { username: null, storeName: null, foundVia: "No entity_id", success: false };
  }

  const username = usernameMatch[1];

  // Look for _ssn (seller short name) which is the store display name
  const ssnMatch = html.match(/"_ssn"\s*:\s*"([^"]+)"/);
  if (ssnMatch && ssnMatch[1]) {
    const storeName = normalizeStoreName(ssnMatch[1]);
    return {
      username,
      storeName: storeName || null,
      foundVia: "_ssn field",
      success: true,
    };
  }

  // Found username but no store name
  return {
    username,
    storeName: null,
    foundVia: "entity_id only",
    success: true,
  };
}

/**
 * Strategy 3: Try window.__ embedded data
 */
function tryWindowData(html: string): StoreNameResult {
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
    /window\.__ITEM_PAGE__\s*=\s*({[\s\S]+?});/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;

    try {
      const data = JSON.parse(match[1]);
      const seller = data.seller || data.item?.seller || data.modules?.SELLER?.seller;

      if (seller) {
        const username = seller.userName || seller.username || null;
        const storeName = normalizeStoreName(seller.storeName || seller.sellerBusinessName);

        if (username || storeName) {
          return {
            username,
            storeName: storeName || null,
            foundVia: "window.__ JSON",
            success: true,
          };
        }
      }
    } catch (e) {
      // JSON parsing failed, continue
    }
  }

  return { username: null, storeName: null, foundVia: "No window data", success: false };
}

/**
 * Strategy 4: DOM selectors (most fragile, last resort)
 */
function tryDomSelectors(html: string): StoreNameResult {
  let username: string | null = null;
  let storeName: string | null = null;

  // Try to find username
  const usernamePatterns = [
    /<span[^>]*class="[^"]*ux-seller-section__item--seller[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class="[^"]*seller-persona[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i,
    /<a[^>]*class="[^"]*mbg-nw[^"]*"[^>]*>([^<]+)<\/a>/i,
  ];

  for (const pattern of usernamePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      username = match[1].trim();
      break;
    }
  }

  // Try to find store name
  const storePatterns = [
    /<div[^>]*class="[^"]*str-seller-card__store-name[^"]*"[^>]*>([^<]+)<\/div>/i,
    /<a[^>]*href="[^"]*stores\.ebay\.com[^"]*"[^>]*>([^<]+)<\/a>/i,
  ];

  for (const pattern of storePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      storeName = normalizeStoreName(match[1]);
      break;
    }
  }

  if (username || storeName) {
    return {
      username,
      storeName: storeName || null,
      foundVia: "DOM selectors",
      success: true,
    };
  }

  return { username: null, storeName: null, foundVia: "No DOM matches", success: false };
}

/**
 * Normalize store name: trim, collapse whitespace, basic validation
 */
function normalizeStoreName(name: string | null | undefined): string | null {
  if (!name) return null;

  const normalized = name
    .trim()
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .replace(/^\s+|\s+$/g, ""); // Trim again

  // Validate length (reject if too short or suspiciously long)
  if (normalized.length < 2 || normalized.length > 100) {
    return null;
  }

  return normalized;
}

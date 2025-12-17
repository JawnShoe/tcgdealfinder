/**
 * Verification script: Extract seller store name from a single eBay listing URL
 * 
 * Test case: https://www.ebay.com/itm/177383271547
 * Expected:
 *   - username: andre17
 *   - store name: brazil shop
 */

interface ScrapedSellerData {
  username: string | null;
  storeName: string | null;
  foundVia: string;
}

async function verifyEbayStoreName(itemIdOrUrl: string): Promise<ScrapedSellerData> {
  // Extract item ID from URL if needed
  const itemId = itemIdOrUrl.includes("ebay.com")
    ? itemIdOrUrl.match(/\/itm\/(\d+)/)?.[1] || itemIdOrUrl
    : itemIdOrUrl;

  const url = `https://www.ebay.com/itm/${itemId}`;
  console.log(`Fetching: ${url}\n`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Strategy 1: Look for JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const seller = jsonLd.seller || jsonLd["@graph"]?.find((n: any) => n["@type"] === "Person");
        if (seller) {
          return {
            username: seller.name || seller.identifier || null,
            storeName: seller.name || null,
            foundVia: "JSON-LD",
          };
        }
      } catch (e) {
        // JSON-LD parsing failed, continue
      }
    }

    // Strategy 2: Extract seller username and store name from HTML
    // Pattern 1: Look for entity_id":"~andre17" pattern
    const usernameMatch = html.match(/entity_id["']\s*:\s*["']~?([^"']+)["']/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      
      // Now look for store name near this username
      // Pattern: "brazil shop" or "brazilonlineshop" as store name
      const storePatterns = [
        // eBay often puts store name in _ssn (seller short name) field
        /"_ssn"\s*:\s*"([^"]+)"/,
        // Look for sellerName or storeName fields
        new RegExp(`["'](?:sellerName|storeName|sellerBusinessName)["']\\s*:\\s*["']([^"']+)["']`),
        // Look for "brazil shop" specifically in context
        /"sellerInfo"[^}]*"name"\s*:\s*"([^"]+)"/,
        // Look in nearby text after finding the seller
        /(?:store|shop|seller)["']?\s*:\s*["']([^"']+brazil[^"']*shop[^"']+)["']/i,
      ];
      
      for (const pattern of storePatterns) {
        const storeMatch = html.match(pattern);
        if (storeMatch && storeMatch[1]) {
          const storeName = storeMatch[1].trim();
          // Validate it looks like a store name, not a random match
          if (storeName.length > 2 && storeName.length < 100) {
            return {
              username,
              storeName,
              foundVia: "Entity ID + store pattern",
            };
          }
        }
      }
      
      // If we found username but not store, search more broadly
      // Look for "brazil shop" text near the username
      const contextMatch = html.match(new RegExp(`${username}[\\s\\S]{0,1000}(brazil[\\s-]*shop)`, 'i'));
      if (contextMatch) {
        return {
          username,
          storeName: contextMatch[1],
          foundVia: "Username + nearby store text",
        };
      }
      
      return {
        username,
        storeName: null,
        foundVia: "Entity ID only",
      };
    }

    const patterns = [
      /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
      /window\.__ITEM_PAGE__\s*=\s*({.+?});/s,
      /"seller"\s*:\s*{[^}]*"userName"\s*:\s*"([^"]+)"[^}]*"storeName"\s*:\s*"([^"]+)"/,
      /"seller"\s*:\s*{[^}]*"storeName"\s*:\s*"([^"]+)"[^}]*"userName"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[0].startsWith("window")) {
          try {
            const data = JSON.parse(match[1]);
            const seller = data.seller || data.item?.seller || data.modules?.SELLER?.seller;
            if (seller) {
              return {
                username: seller.userName || seller.username || null,
                storeName: seller.storeName || seller.sellerBusinessName || null,
                foundVia: "window.__ JSON",
              };
            }
          } catch (e) {
            // JSON parsing failed, continue
          }
        } else {
          // Direct regex capture of seller fields
          return {
            username: match[2] || match[1],
            storeName: match[1] || match[2],
            foundVia: "Inline JSON pattern",
          };
        }
      }
    }

    // Strategy 3: DOM/HTML selectors (more fragile)
    const sellerPatterns = [
      // Seller info section patterns
      /<span[^>]*class="[^"]*ux-seller-section__item--seller[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="[^"]*seller-persona[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i,
      /<a[^>]*class="[^"]*mbg-nw[^"]*"[^>]*>([^<]+)<\/a>/i,
      // Store name patterns
      /<div[^>]*class="[^"]*str-seller-card__store-name[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<a[^>]*href="[^"]*stores\.ebay\.com[^"]*"[^>]*>([^<]+)<\/a>/i,
    ];

    let username: string | null = null;
    let storeName: string | null = null;

    for (const pattern of sellerPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (pattern.source.includes("store") || pattern.source.includes("stores.ebay")) {
          storeName = value;
        } else {
          username = value;
        }
      }
    }

    if (username || storeName) {
      return {
        username,
        storeName,
        foundVia: "DOM selectors",
      };
    }

    // Strategy 4: Look for any mention of seller info in meta tags or data attributes
    const metaSellerMatch = html.match(/<meta[^>]*property="og:seller"[^>]*content="([^"]+)"/i);
    if (metaSellerMatch) {
      return {
        username: metaSellerMatch[1],
        storeName: null,
        foundVia: "Meta tag",
      };
    }

    return {
      username: null,
      storeName: null,
      foundVia: "Not found",
    };
  } catch (error) {
    console.error("Error fetching/parsing:", error);
    throw error;
  }
}

async function main() {
  const testUrl = "https://www.ebay.com/itm/177383271547";
  
  console.log("=== eBay Store Name Verification ===\n");
  console.log(`Test URL: ${testUrl}`);
  console.log(`Expected username: andre17`);
  console.log(`Expected store name: brazil shop\n`);
  console.log("---\n");

  const result = await verifyEbayStoreName(testUrl);

  console.log("Results:");
  console.log(`  Username: ${result.username || "(not found)"}`);
  console.log(`  Store Name: ${result.storeName || "(not found)"}`);
  console.log(`  Method: ${result.foundVia}`);

  console.log("\n---\n");

  if (result.username === "andre17" && result.storeName === "brazil shop") {
    console.log("✅ PASS: Extracted expected values!");
  } else {
    console.log("⚠️  Values don't match expected. Check if:");
    console.log("   - The listing is still active");
    console.log("   - eBay changed their HTML structure");
    console.log("   - The seller changed their store name");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });

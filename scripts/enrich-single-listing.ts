/**
 * DEPRECATED: Uses Shopping API which is now disabled.
 *
 * This script will only return results for sellers with manual overrides
 * defined in lib/rebuild/scripts/ebayStorefront.ts. API calls are blocked.
 */
import "dotenv/config";
import { query } from "../lib/db";
import { fetchStorefrontInfo } from "../lib/rebuild/scripts/ebayStorefront";

const listingId = process.argv[2];
const market = process.argv[3] || "EBAY_US";
const seller = process.argv[4] || null;

if (!listingId) {
  console.error(
    "Usage: npx tsx scripts/enrich-single-listing.ts <listingId> [market] [sellerUsername]"
  );
  console.error(
    "\n⚠️  NOTE: Shopping API is disabled. Only manual overrides will return results."
  );
  process.exit(1);
}

(async () => {
  const info = await fetchStorefrontInfo(listingId, market as any, seller);
  console.log("Enrichment result:", info);
  await query(
    `UPDATE listings SET seller_store_name = $1, seller_store_name_source = $2, seller_store_name_last_checked_at = NOW() WHERE listing_id = $3`,
    [info?.storeName ?? null, info?.source ?? null, listingId]
  );
  process.exit(0);
})();

/**
 * Backfill seller store names from eBay HTML
 * 
 * Processes listings with seller_store_name IS NULL and attempts to
 * scrape the store name from the eBay listing page.
 * 
 * Features:
 * - Rate limiting (750-1500ms delay between requests with jitter)
 * - Caching (skips recently checked listings)
 * - Exponential backoff on errors
 * - Batch size limiting
 * - Progress tracking
 * 
 * Usage:
 *   npx tsx scripts/backfill-seller-store-names.ts [--limit=50] [--market=EBAY_US] [--force]
 */

import { query } from "../lib/db";
import { getStoreNameForItemId } from "../lib/ebayStoreNameScraper";

interface BackfillStats {
  total: number;
  processed: number;
  found: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface ListingToProcess {
  listing_id: string; // This IS the eBay item ID
  seller_username: string;
  market: string;
  last_checked_at: Date | null;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_MARKET = "EBAY_US";
const MIN_DELAY_MS = 750;
const MAX_DELAY_MS = 1500;
const CACHE_DURATION_DAYS = 7;
const MAX_RETRIES = 3;

/**
 * Parse command line arguments
 */
function parseArgs(): { limit: number; market: string; force: boolean } {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let market = DEFAULT_MARKET;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--market=")) {
      market = arg.split("=")[1];
    } else if (arg === "--force") {
      force = true;
    }
  }

  return { limit, market, force };
}

/**
 * Random delay between min and max (with jitter for politeness)
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Fetch listings that need store name backfill
 */
async function getListingsToProcess(
  market: string,
  limit: number,
  force: boolean
): Promise<ListingToProcess[]> {
  const cacheCutoff = force ? null : new Date(Date.now() - CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

  let sql = `
    SELECT 
      listing_id,
      seller_username,
      market,
      seller_store_name_last_checked_at as last_checked_at
    FROM listings
    WHERE market = $1
      AND seller_store_name IS NULL
  `;

  const params: any[] = [market, limit];

  if (!force) {
    sql += ` AND (seller_store_name_last_checked_at IS NULL OR seller_store_name_last_checked_at < $3)`;
    params.push(cacheCutoff);
  }

  sql += ` ORDER BY created_at DESC LIMIT $2`;

  const res = await query<ListingToProcess>(sql, params);
  return res.rows;
}

/**
 * Update listing with store name result
 */
async function updateListingStoreName(
  listingId: string,
  storeName: string | null,
  source: "html" | null,
  success: boolean
): Promise<void> {
  const now = new Date();

  await query(
    `UPDATE listings 
     SET seller_store_name = $1,
         seller_store_name_source = $2,
         seller_store_name_last_checked_at = $3
     WHERE listing_id = $4`,
    [storeName, source, now, listingId]
  );
}

/**
 * Process a single listing with retry logic
 */
async function processListing(
  listing: ListingToProcess,
  stats: BackfillStats,
  retries: number = 0
): Promise<void> {
  try {
    // Extract numeric item ID from listing_id (format: "v1|146349781815|0")
    const itemId = listing.listing_id.split("|")[1] || listing.listing_id;
    
    console.log(
      `[${stats.processed + 1}/${stats.total}] Processing item ${itemId} (${listing.seller_username})...`
    );

    const result = await getStoreNameForItemId(itemId, listing.market);

    if (result.success && result.storeName) {
      console.log(`  ✓ Found store name: "${result.storeName}" (via ${result.foundVia})`);
      await updateListingStoreName(listing.listing_id, result.storeName, "html", true);
      stats.found++;
    } else if (result.foundVia === "Rate limited (429)" && retries < MAX_RETRIES) {
      // Exponential backoff for rate limits
      const backoffMs = Math.min(30000, (retries + 1) * 5000);
      console.log(`  ⚠ Rate limited, waiting ${backoffMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return processListing(listing, stats, retries + 1);
    } else {
      console.log(`  ✗ No store name found (${result.foundVia})`);
      // Mark as checked even if not found to avoid re-checking immediately
      await updateListingStoreName(listing.listing_id, null, null, false);
      stats.failed++;
    }

    stats.processed++;
  } catch (error: any) {
    console.error(`  ✗ Error processing listing: ${error.message}`);
    stats.errors.push(`${listing.listing_id}: ${error.message}`);
    stats.failed++;
    stats.processed++;

    // Still mark as checked to avoid immediate retry
    await updateListingStoreName(listing.listing_id, null, null, false);
  }
}

/**
 * Main backfill process
 */
async function backfillStoreNames() {
  const { limit, market, force } = parseArgs();

  console.log("=== eBay Store Name Backfill ===\n");
  console.log(`Market: ${market}`);
  console.log(`Limit: ${limit} listings`);
  console.log(`Force re-check: ${force ? "YES" : "NO"}`);
  console.log(`Cache duration: ${CACHE_DURATION_DAYS} days`);
  console.log(`Rate limit: ${MIN_DELAY_MS}-${MAX_DELAY_MS}ms between requests\n`);

  // Fetch listings to process
  console.log("Fetching listings to process...");
  const listings = await getListingsToProcess(market, limit, force);

  if (listings.length === 0) {
    console.log("\n✓ No listings need processing!");
    console.log("\nTips:");
    console.log("  - Use --force to re-check recently processed listings");
    console.log("  - Check if all listings already have store names");
    return;
  }

  console.log(`Found ${listings.length} listings to process\n`);
  console.log("---\n");

  const stats: BackfillStats = {
    total: listings.length,
    processed: 0,
    found: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Process listings sequentially with rate limiting
  for (const listing of listings) {
    await processListing(listing, stats);

    // Rate limit between requests (except for last one)
    if (stats.processed < listings.length) {
      await randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
    }
  }

  // Print summary
  console.log("\n---\n");
  console.log("=== Backfill Complete ===\n");
  console.log(`Processed: ${stats.processed}/${stats.total}`);
  console.log(`Found: ${stats.found}`);
  console.log(`Not found: ${stats.failed}`);
  console.log(`Success rate: ${((stats.found / stats.processed) * 100).toFixed(1)}%`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  console.log("\nTo continue processing more listings, run this script again.");
}

// Run backfill
backfillStoreNames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

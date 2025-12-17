/**
 * Backfill seller_store_name via the official eBay Shopping API.
 *
 * Usage:
 *   npx tsx scripts/backfill-seller-store-names.ts [--limit=50] [--market=EBAY_US] [--force]
 */

import { query } from "../lib/db";
import { fetchStorefrontInfo } from "../lib/ebayStorefront";
import type { MarketCode } from "../lib/markets";

interface BackfillStats {
  total: number;
  processed: number;
  found: number;
  failed: number;
  errors: string[];
}

interface ListingToProcess {
  listing_id: string;
  seller_username: string;
  market: string;
  last_checked_at: Date | null;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_MARKET: MarketCode = "EBAY_US";
const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 750;
const CACHE_DURATION_DAYS = 7;

function parseArgs(): { limit: number; market: MarketCode; force: boolean } {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let market = DEFAULT_MARKET;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--market=")) {
      market = arg.split("=")[1] as MarketCode;
    } else if (arg === "--force") {
      force = true;
    }
  }

  return { limit, market, force };
}

function randomDelay(min: number, max: number): Promise<void> {
  const duration = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function getListingsToProcess(
  market: MarketCode,
  limit: number,
  force: boolean,
): Promise<ListingToProcess[]> {
  const cutoff = force
    ? null
    : new Date(Date.now() - CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

  let sql = `
    SELECT 
      listing_id,
      seller_username,
      market,
      seller_store_name_last_checked_at AS last_checked_at
    FROM listings
    WHERE market = $1
      AND seller_store_name IS NULL
  `;

  const params: Array<string | number | Date | null> = [market, limit];

  if (!force) {
    sql += ` AND (seller_store_name_last_checked_at IS NULL OR seller_store_name_last_checked_at < $3)`;
    params.push(cutoff);
  }

  sql += ` ORDER BY created_at DESC LIMIT $2`;

  const res = await query<ListingToProcess>(sql, params);
  return res.rows;
}

async function updateListingStoreName(
  listingId: string,
  storeName: string | null,
  source: string | null,
): Promise<void> {
  const now = new Date();
  await query(
    `
    UPDATE listings
    SET seller_store_name = $1,
        seller_store_name_source = $2,
        seller_store_name_last_checked_at = $3
    WHERE listing_id = $4
  `,
    [storeName, source, now, listingId],
  );
}

async function processListing(
  listing: ListingToProcess,
  stats: BackfillStats,
): Promise<void> {
  try {
    const itemId = listing.listing_id.split("|")[1] || listing.listing_id;
    console.log(
      `[${stats.processed + 1}/${stats.total}] item=${itemId} seller=${listing.seller_username}`,
    );

    const result = await fetchStorefrontInfo(
      listing.listing_id,
      listing.market as MarketCode,
      listing.seller_username,
    );

    if (result?.storeName) {
      console.log(`  ✓ ${result.storeName}`);
      await updateListingStoreName(
        listing.listing_id,
        result.storeName,
        result.source,
      );
      stats.found++;
    } else {
      console.log("  ⚠️  No storefront info returned");
      await updateListingStoreName(listing.listing_id, null, null);
      stats.failed++;
    }
  } catch (error) {
    console.error(
      `  ⚠️  Error: ${(error as Error).message ?? String(error)}`,
    );
    stats.errors.push(`${listing.listing_id}: ${(error as Error).message}`);
    stats.failed++;
    await updateListingStoreName(listing.listing_id, null, null);
  } finally {
    stats.processed++;
  }
}

async function backfillStoreNames(): Promise<void> {
  const { limit, market, force } = parseArgs();

  console.log("=== eBay store-name backfill ===");
  console.log(`Market: ${market}`);
  console.log(`Limit: ${limit}`);
  console.log(`Force re-check: ${force ? "YES" : "NO"}`);
  console.log(
    `Cooldown between requests: ${MIN_DELAY_MS}-${MAX_DELAY_MS} ms\n`,
  );

  const listings = await getListingsToProcess(market, limit, force);
  if (listings.length === 0) {
    console.log("No listings require enrichment. ✅");
    return;
  }

  const stats: BackfillStats = {
    total: listings.length,
    processed: 0,
    found: 0,
    failed: 0,
    errors: [],
  };

  for (const listing of listings) {
    await processListing(listing, stats);
    if (stats.processed < stats.total) {
      await randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Processed: ${stats.processed}/${stats.total}`);
  console.log(`Found:     ${stats.found}`);
  console.log(`Missing:   ${stats.failed}`);
  if (stats.errors.length > 0) {
    console.log("Errors:");
    stats.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

backfillStoreNames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

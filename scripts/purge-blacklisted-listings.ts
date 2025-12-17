/**
 * Purge blacklisted listings from the database
 * 
 * Scans existing listings and removes/marks those matching blacklist criteria.
 * Run with: npx tsx scripts/purge-blacklisted-listings.ts
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --delete     Actually delete the listings (default is dry-run)
 */

import { query } from "../lib/db";
import { getBlacklistReason, type BlacklistResult } from "../lib/blacklist";

type ListingRow = {
  id: number;
  listing_id: string | null;
  title: string;
  url: string;
  seller_username: string | null;
  market: string | null;
};

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--delete");
  
  if (isDryRun) {
    console.log("=== DRY RUN MODE (use --delete to actually remove listings) ===\n");
  } else {
    console.log("=== DELETE MODE - Will remove matching listings ===\n");
  }
  
  // Fetch all listings
  console.log("Fetching all listings...");
  const result = await query<ListingRow>(`
    SELECT id, listing_id, title, url, seller_username, market
    FROM listings
    ORDER BY id;
  `);
  
  console.log(`Found ${result.rows.length} total listings\n`);
  
  // Process each listing
  const blocked: Array<ListingRow & BlacklistResult> = [];
  const byCategory: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  
  for (const listing of result.rows) {
    const blacklistResult = getBlacklistReason({ title: listing.title });
    
    if (blacklistResult.blocked) {
      blocked.push({ ...listing, ...blacklistResult });
      const cat = blacklistResult.category ?? "unknown";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      const reason = blacklistResult.reason ?? "unknown";
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
  }
  
  // Print summary
  console.log("=== BLACKLIST SCAN RESULTS ===\n");
  console.log(`Total listings scanned: ${result.rows.length}`);
  console.log(`Blacklisted listings found: ${blocked.length}`);
  console.log(`Clean listings: ${result.rows.length - blocked.length}`);
  console.log();
  
  // By category
  console.log("=== BY CATEGORY ===");
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  for (const [category, count] of sortedCategories) {
    console.log(`  ${category}: ${count}`);
  }
  console.log();
  
  // Top 20 reasons
  console.log("=== TOP 20 REASONS ===");
  const sortedReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  for (const [reason, count] of sortedReasons) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log();
  
  // Sample blocked listings
  console.log("=== SAMPLE BLOCKED LISTINGS (first 20) ===");
  for (const listing of blocked.slice(0, 20)) {
    console.log(`  ID: ${listing.id}`);
    console.log(`    Title: ${listing.title.substring(0, 80)}${listing.title.length > 80 ? "..." : ""}`);
    console.log(`    Reason: ${listing.reason}`);
    console.log(`    Category: ${listing.category}`);
    console.log(`    URL: ${listing.url}`);
    console.log();
  }
  
  if (blocked.length === 0) {
    console.log("\n✅ No blacklisted listings found - database is clean!");
    process.exit(0);
  }
  
  // Delete if not dry run
  if (!isDryRun && blocked.length > 0) {
    console.log(`\n=== DELETING ${blocked.length} BLACKLISTED LISTINGS ===\n`);
    
    const idsToDelete = blocked.map(l => l.id);
    
    // Delete in batches of 100
    const batchSize = 100;
    let deleted = 0;
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(", ");
      
      const deleteResult = await query(
        `DELETE FROM listings WHERE id IN (${placeholders})`,
        batch
      );
      
      deleted += deleteResult.rowCount ?? 0;
      console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}: ${deleteResult.rowCount} rows`);
    }
    
    console.log(`\n✅ Deleted ${deleted} blacklisted listings`);
  } else if (blocked.length > 0) {
    console.log(`\n⚠️  ${blocked.length} listings would be deleted. Run with --delete to remove them.`);
  }
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

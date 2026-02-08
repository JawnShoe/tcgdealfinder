/**
 * Purge blacklisted listings from the database
 *
 * Scans existing listings and removes/marks those matching blacklist criteria.
 *
 * SAFETY: This script has multiple safety gates to prevent accidental data loss.
 *
 * Usage (dry-run, always safe):
 *   npx tsx scripts/purge-blacklisted-listings.ts
 *
 * Usage (delete mode, requires explicit confirmation):
 *   CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete
 *
 * Production usage (requires BOTH flags):
 *   CONFIRM_PROD_DELETE=YES CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting (DEFAULT)
 *   --delete     Actually delete the listings (requires CONFIRM_DELETE=YES)
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

/**
 * Validates safety gates before allowing destructive operations.
 * Returns true if delete is allowed, false otherwise.
 */
function validateSafetyGates(wantsDelete: boolean): {
  allowed: boolean;
  reason?: string;
} {
  if (!wantsDelete) {
    return { allowed: true }; // Dry-run is always allowed
  }

  const confirmDelete = process.env.CONFIRM_DELETE === "YES";
  const isProduction = process.env.NODE_ENV === "production";
  const confirmProdDelete = process.env.CONFIRM_PROD_DELETE === "YES";

  if (!confirmDelete) {
    return {
      allowed: false,
      reason:
        "Delete mode requires CONFIRM_DELETE=YES environment variable.\n" +
        "Example: CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete",
    };
  }

  if (isProduction && !confirmProdDelete) {
    return {
      allowed: false,
      reason:
        "Production delete requires BOTH CONFIRM_DELETE=YES AND CONFIRM_PROD_DELETE=YES.\n" +
        "Example: CONFIRM_PROD_DELETE=YES CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete\n" +
        "\n" +
        "WARNING: You are about to delete data from PRODUCTION. This cannot be undone.",
    };
  }

  return { allowed: true };
}

async function main() {
  const args = process.argv.slice(2);
  const wantsDelete = args.includes("--delete");
  const isDryRun = !wantsDelete;

  // Safety gate validation
  const safetyCheck = validateSafetyGates(wantsDelete);
  if (!safetyCheck.allowed) {
    console.error("=== SAFETY GATE BLOCKED ===\n");
    console.error(safetyCheck.reason);
    console.error("\nExiting without changes.");
    process.exit(1);
  }

  if (isDryRun) {
    console.log(
      "=== DRY RUN MODE (use --delete with CONFIRM_DELETE=YES to actually remove listings) ===\n"
    );
  } else {
    const isProduction = process.env.NODE_ENV === "production";
    console.log(
      `=== DELETE MODE${isProduction ? " (PRODUCTION)" : ""} - Will remove matching listings ===\n`
    );
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
  const sortedCategories = Object.entries(byCategory).sort(
    (a, b) => b[1] - a[1]
  );
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
    console.log(
      `    Title: ${listing.title.substring(0, 80)}${listing.title.length > 80 ? "..." : ""}`
    );
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

    const idsToDelete = blocked.map((l) => l.id);

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
      console.log(
        `  Deleted batch ${Math.floor(i / batchSize) + 1}: ${deleteResult.rowCount} rows`
      );
    }

    console.log(`\n✅ Deleted ${deleted} blacklisted listings`);
  } else if (blocked.length > 0) {
    console.log(
      `\n⚠️  ${blocked.length} listings would be deleted.\n` +
        "To delete, run: CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete"
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

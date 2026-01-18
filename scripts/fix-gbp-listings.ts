#!/usr/bin/env tsx
/**
 * Fix GBP listings with inverted FX rate.
 *
 * This script:
 * 1. Updates the GBP rate in fx_rates table to correct value (1.35)
 * 2. Recalculates total_usd for all GBP listings
 *
 * Usage:
 *   npx tsx scripts/fix-gbp-listings.ts           # Dry run
 *   npx tsx scripts/fix-gbp-listings.ts --apply   # Apply changes
 */

import { query } from "../lib/db";
import {
  getFXRates,
  updateFXRate,
  validateFXRateDirection,
  invalidateFXCache,
} from "../lib/rebuild/scripts/fxRates";

const CORRECT_GBP_RATE = 1.35; // GBP→USD rate as of Dec 2025 (1 GBP ≈ 1.35 USD)

interface ListingRow {
  id: number;
  listing_id: string;
  total_native: string;
  fx_rate_to_usd: string | null;
  total_usd: string | null;
}

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes("--apply");

  console.log("=== Fix GBP Listings ===\n");
  console.log(`Mode: ${applyChanges ? "APPLY CHANGES" : "DRY RUN"}\n`);

  // 1. Check current GBP rate
  console.log("1. Checking current FX rates...");
  const rates = await getFXRates();
  const currentGbpRate = rates.get("GBP");

  if (currentGbpRate == null) {
    console.log("   ❌ No GBP rate found in database");
    console.log(
      "   Run: INSERT INTO fx_rates (currency, rate_to_usd) VALUES ('GBP', 1.35);"
    );
    process.exit(1);
  }

  console.log(`   Current GBP rate: ${currentGbpRate}`);

  // Validate current rate
  const currentError = validateFXRateDirection("GBP", currentGbpRate);
  if (currentError) {
    console.log(`   ❌ INVALID: ${currentError}`);
  } else {
    console.log(`   ✓ Rate direction is valid`);
  }

  // Check if update needed
  const rateNeedsUpdate = currentGbpRate < 1.0;
  if (rateNeedsUpdate) {
    console.log(
      `\n   → Will update GBP rate: ${currentGbpRate} → ${CORRECT_GBP_RATE}`
    );
  } else {
    console.log(`\n   → GBP rate looks correct, checking listings anyway...`);
  }

  // 2. Find GBP listings that need recalculation
  console.log("\n2. Finding GBP listings to recalculate...");

  const listings = await query<ListingRow>(
    `
    SELECT id, listing_id, total_native, fx_rate_to_usd, total_usd
    FROM listings
    WHERE currency = 'GBP' AND total_native IS NOT NULL
    ORDER BY id
    `
  );

  console.log(`   Found ${listings.rows.length} GBP listings`);

  if (listings.rows.length === 0) {
    console.log("\n✓ No GBP listings to update.");
    process.exit(0);
  }

  // 3. Calculate changes
  console.log("\n3. Calculating changes...");

  interface Change {
    id: number;
    listingId: string;
    totalNative: number;
    oldRate: number | null;
    oldUsd: number | null;
    newUsd: number;
  }

  const changes: Change[] = [];
  const targetRate = rateNeedsUpdate ? CORRECT_GBP_RATE : currentGbpRate;

  for (const row of listings.rows) {
    const totalNative = parseFloat(row.total_native);
    const oldRate = row.fx_rate_to_usd ? parseFloat(row.fx_rate_to_usd) : null;
    const oldUsd = row.total_usd ? parseFloat(row.total_usd) : null;
    const newUsd = Number((totalNative * targetRate).toFixed(2));

    // Check if change is needed
    const needsUpdate =
      oldRate == null ||
      Math.abs(oldRate - targetRate) > 0.001 ||
      oldUsd == null ||
      Math.abs(oldUsd - newUsd) > 0.01;

    if (needsUpdate) {
      changes.push({
        id: row.id,
        listingId: row.listing_id,
        totalNative,
        oldRate,
        oldUsd,
        newUsd,
      });
    }
  }

  console.log(`   ${changes.length} listings need recalculation`);

  if (changes.length === 0) {
    console.log("\n✓ All GBP listings are already correct.");
    process.exit(0);
  }

  // 4. Show sample changes
  console.log("\n4. Sample changes (first 5):");
  for (let i = 0; i < Math.min(5, changes.length); i++) {
    const c = changes[i];
    console.log(`\n   ${c.listingId}:`);
    console.log(
      `     Before: GBP ${c.totalNative.toFixed(2)} × ${c.oldRate?.toFixed(4) ?? "null"} = $${c.oldUsd?.toFixed(2) ?? "null"}`
    );
    console.log(
      `     After:  GBP ${c.totalNative.toFixed(2)} × ${targetRate.toFixed(4)} = $${c.newUsd.toFixed(2)}`
    );
  }

  if (!applyChanges) {
    console.log("\n⚠️  DRY RUN - No changes applied.");
    console.log("   Run with --apply to update the database.\n");
    process.exit(0);
  }

  // 5. Apply changes
  console.log("\n5. Applying changes...");

  // Update FX rate first
  if (rateNeedsUpdate) {
    console.log(`   Updating GBP rate to ${CORRECT_GBP_RATE}...`);
    await updateFXRate("GBP", CORRECT_GBP_RATE, "Fixed inverted rate");
    console.log("   ✓ GBP rate updated");
  }

  // Update listings
  console.log(`   Updating ${changes.length} listings...`);
  let updated = 0;

  for (const change of changes) {
    await query(
      `UPDATE listings SET fx_rate_to_usd = $1, total_usd = $2 WHERE id = $3`,
      [targetRate, change.newUsd, change.id]
    );
    updated++;
    if (updated % 100 === 0) {
      console.log(`   ...updated ${updated}/${changes.length}`);
    }
  }

  console.log(`   ✓ Updated ${updated} listings`);

  // 6. Verify
  console.log("\n6. Verification:");

  // Verify rate
  invalidateFXCache();
  const newRates = await getFXRates();
  const newGbpRate = newRates.get("GBP");
  console.log(`   GBP rate in DB: ${newGbpRate}`);

  // Verify a sample listing
  if (changes.length > 0) {
    const sample = changes[0];
    const verify = await query<{ total_usd: string; fx_rate_to_usd: string }>(
      `SELECT total_usd, fx_rate_to_usd FROM listings WHERE id = $1`,
      [sample.id]
    );
    const v = verify.rows[0];
    console.log(`   Sample listing ${sample.listingId}:`);
    console.log(`     total_usd = $${v.total_usd}`);
    console.log(`     fx_rate_to_usd = ${v.fx_rate_to_usd}`);
  }

  console.log("\n✓ Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

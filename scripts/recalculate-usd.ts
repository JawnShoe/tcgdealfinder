#!/usr/bin/env tsx
/**
 * Recalculate total_usd for all listings based on current FX rates.
 *
 * This script fixes listings that were ingested with incorrect FX rates
 * (e.g., inverted GBP rate of ~0.79 instead of ~1.35).
 *
 * Usage:
 *   npx tsx scripts/recalculate-usd.ts              # Dry run (show what would change)
 *   npx tsx scripts/recalculate-usd.ts --apply      # Apply changes
 *   npx tsx scripts/recalculate-usd.ts --currency GBP --apply  # Only GBP listings
 */

import { query } from "../lib/db";
import { getFXRates, validateFXRate } from "../lib/fxRates";

interface ListingRow {
  id: number;
  listing_id: string;
  market: string;
  currency: string;
  total_native: string | null;
  fx_rate_to_usd: string | null;
  total_usd: string | null;
}

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes("--apply");
  const currencyFilter = args.includes("--currency")
    ? args[args.indexOf("--currency") + 1]?.toUpperCase()
    : null;

  console.log("=== Recalculate USD for Listings ===\n");

  // 1. Validate current FX rates
  console.log("1. Current FX rates:");
  const rates = await getFXRates();
  let hasInvalidRates = false;

  for (const [currency, rate] of rates.entries()) {
    const error = validateFXRate(currency, rate);
    if (error) {
      console.log(`   ❌ ${currency}: ${rate.toFixed(6)} - INVALID`);
      console.log(`      ${error}`);
      hasInvalidRates = true;
    } else {
      console.log(`   ✅ ${currency}: ${rate.toFixed(6)}`);
    }
  }

  if (hasInvalidRates) {
    console.log("\n⚠️  Some FX rates are invalid. Fix them first with:");
    console.log(
      "   npx tsx scripts/update-fx-rates.ts --currency GBP --rate 1.35"
    );
    if (!applyChanges) {
      console.log("\nContinuing with dry run to show what needs fixing...\n");
    } else {
      console.log("\nAborting. Fix FX rates before applying changes.");
      process.exit(1);
    }
  }

  // 2. Find listings that need recalculation
  let whereClause = "WHERE total_native IS NOT NULL AND currency IS NOT NULL";
  const params: string[] = [];

  if (currencyFilter) {
    whereClause += " AND currency = $1";
    params.push(currencyFilter);
  }

  const listings = await query<ListingRow>(
    `
    SELECT id, listing_id, market, currency, total_native, fx_rate_to_usd, total_usd
    FROM listings
    ${whereClause}
    ORDER BY currency, market, id
    `,
    params
  );

  console.log(`\n2. Found ${listings.rows.length} listings to check\n`);

  // 3. Calculate differences
  interface Change {
    id: number;
    listingId: string;
    market: string;
    currency: string;
    totalNative: number;
    oldRate: number | null;
    newRate: number;
    oldUsd: number | null;
    newUsd: number;
  }

  const changes: Change[] = [];
  const currencyStats: Record<
    string,
    { checked: number; changed: number; avgDiff: number }
  > = {};

  for (const row of listings.rows) {
    const currency = row.currency;
    const totalNative = row.total_native ? parseFloat(row.total_native) : null;
    const oldRate = row.fx_rate_to_usd ? parseFloat(row.fx_rate_to_usd) : null;
    const oldUsd = row.total_usd ? parseFloat(row.total_usd) : null;

    if (totalNative == null || !Number.isFinite(totalNative)) {
      continue;
    }

    const newRate = rates.get(currency);
    if (newRate == null) {
      console.warn(
        `   ⚠️ No FX rate for ${currency}, skipping listing ${row.listing_id}`
      );
      continue;
    }

    const newUsd = Number((totalNative * newRate).toFixed(2));

    // Track stats
    if (!currencyStats[currency]) {
      currencyStats[currency] = { checked: 0, changed: 0, avgDiff: 0 };
    }
    currencyStats[currency].checked++;

    // Check if change is needed (rate changed or USD is different)
    const rateChanged = oldRate == null || Math.abs(oldRate - newRate) > 0.0001;
    const usdChanged = oldUsd == null || Math.abs(oldUsd - newUsd) > 0.01;

    if (rateChanged || usdChanged) {
      changes.push({
        id: row.id,
        listingId: row.listing_id,
        market: row.market,
        currency,
        totalNative,
        oldRate,
        newRate,
        oldUsd,
        newUsd,
      });
      currencyStats[currency].changed++;
      if (oldUsd != null) {
        currencyStats[currency].avgDiff += Math.abs(newUsd - oldUsd);
      }
    }
  }

  // Finalize avg diff
  for (const stats of Object.values(currencyStats)) {
    if (stats.changed > 0) {
      stats.avgDiff = stats.avgDiff / stats.changed;
    }
  }

  // 4. Report
  console.log("3. Summary by currency:");
  for (const [currency, stats] of Object.entries(currencyStats)) {
    console.log(
      `   ${currency}: ${stats.changed}/${stats.checked} need update` +
        (stats.avgDiff > 0 ? ` (avg diff: $${stats.avgDiff.toFixed(2)})` : "")
    );
  }

  if (changes.length === 0) {
    console.log(
      "\n✅ All listings have correct USD values. Nothing to update."
    );
    process.exit(0);
  }

  console.log(`\n4. ${changes.length} listings need recalculation`);

  // Show sample changes
  const sampleSize = Math.min(5, changes.length);
  console.log(`\n   Sample changes (showing ${sampleSize}):`);
  for (let i = 0; i < sampleSize; i++) {
    const c = changes[i];
    console.log(`   ${c.listingId} (${c.market}):`);
    console.log(
      `     ${c.currency} ${c.totalNative.toFixed(2)} × ${c.oldRate?.toFixed(6) ?? "null"} = $${c.oldUsd?.toFixed(2) ?? "null"}`
    );
    console.log(
      `     → ${c.currency} ${c.totalNative.toFixed(2)} × ${c.newRate.toFixed(6)} = $${c.newUsd.toFixed(2)}`
    );
  }

  if (!applyChanges) {
    console.log("\n⚠️  DRY RUN - No changes applied.");
    console.log("   Run with --apply to update the database.");
    process.exit(0);
  }

  // 5. Apply changes
  console.log(`\n5. Applying ${changes.length} updates...`);

  let updated = 0;
  for (const change of changes) {
    await query(
      `
      UPDATE listings
      SET fx_rate_to_usd = $1, total_usd = $2
      WHERE id = $3
      `,
      [change.newRate, change.newUsd, change.id]
    );
    updated++;

    if (updated % 100 === 0) {
      console.log(`   Updated ${updated}/${changes.length}...`);
    }
  }

  console.log(`\n✅ Updated ${updated} listings.`);

  // Verify a sample
  if (changes.length > 0) {
    const sample = changes[0];
    const verify = await query<{ total_usd: string; fx_rate_to_usd: string }>(
      `SELECT total_usd, fx_rate_to_usd FROM listings WHERE id = $1`,
      [sample.id]
    );
    const verified = verify.rows[0];
    console.log(`\n   Verification (listing ${sample.listingId}):`);
    console.log(`   total_usd = $${verified.total_usd}`);
    console.log(`   fx_rate_to_usd = ${verified.fx_rate_to_usd}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

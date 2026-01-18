#!/usr/bin/env tsx
/**
 * Quick validation test for multi-market implementation
 */

import { query } from "../lib/db";
import { getFXRates } from "../lib/rebuild/scripts/fxRates";
import { SUPPORTED_MARKETS, getMarketLabel } from "../lib/markets";

async function validate() {
  console.log("Multi-Market Implementation Validation\n");
  console.log("=".repeat(60));

  // 1. Check FX Rates
  console.log("\n1. FX Rates Table:");
  const rates = await getFXRates();
  for (const [currency, rate] of rates.entries()) {
    console.log(`   ✅ ${currency}: ${rate.toFixed(6)}`);
  }

  // 2. Check Supported Markets
  console.log("\n2. Supported Markets:");
  for (const market of SUPPORTED_MARKETS) {
    console.log(`   ✅ ${market} (${getMarketLabel(market)})`);
  }

  // 3. Check Database Schema
  console.log("\n3. Database Schema:");

  const fxTable = await query(`
    SELECT COUNT(*) as count FROM information_schema.tables 
    WHERE table_name = 'fx_rates';
  `);
  console.log(
    `   ${fxTable.rows[0].count > 0 ? "✅" : "❌"} fx_rates table exists`
  );

  const currencyCol = await query(`
    SELECT COUNT(*) as count FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'currency';
  `);
  console.log(
    `   ${currencyCol.rows[0].count > 0 ? "✅" : "❌"} listings.currency column exists`
  );

  const totalUsdCol = await query(`
    SELECT COUNT(*) as count FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'total_usd';
  `);
  console.log(
    `   ${totalUsdCol.rows[0].count > 0 ? "✅" : "❌"} listings.total_usd column exists`
  );

  // 4. Check Unique Constraint
  console.log("\n4. Unique Constraints:");
  const oldConstraint = await query(`
    SELECT COUNT(*) as count FROM pg_indexes
    WHERE tablename = 'listings' AND indexdef LIKE '%listing_id)%';
  `);
  console.log(
    `   ${oldConstraint.rows[0].count === 0 ? "✅" : "⚠️ "} Old UNIQUE(listing_id) ${oldConstraint.rows[0].count === 0 ? "removed" : "still exists"}`
  );

  const newConstraint = await query(`
    SELECT COUNT(*) as count FROM pg_indexes
    WHERE tablename = 'listings' 
      AND indexdef LIKE '%listing_id%market%';
  `);
  console.log(
    `   ${newConstraint.rows[0].count > 0 ? "✅" : "❌"} New UNIQUE(listing_id, market) ${newConstraint.rows[0].count > 0 ? "exists" : "missing"}`
  );

  // 5. Check Current Data
  console.log("\n5. Current Listings Data:");

  const marketBreakdown = await query(`
    SELECT market, COUNT(*) as count
    FROM listings
    GROUP BY market
    ORDER BY market;
  `);

  if (marketBreakdown.rows.length === 0) {
    console.log("   ℹ️  No listings in database yet");
  } else {
    for (const row of marketBreakdown.rows) {
      console.log(`   ✅ ${row.market}: ${row.count} listings`);
    }
  }

  const currencyBreakdown = await query(`
    SELECT currency, COUNT(*) as count
    FROM listings
    WHERE currency IS NOT NULL
    GROUP BY currency
    ORDER BY currency;
  `);

  if (currencyBreakdown.rows.length > 0) {
    console.log("\n   Currency breakdown:");
    for (const row of currencyBreakdown.rows) {
      console.log(`   ✅ ${row.currency}: ${row.count} listings`);
    }
  }

  // 6. Check Converted Values
  const convertedCount = await query(`
    SELECT COUNT(*) as count
    FROM listings
    WHERE total_usd IS NOT NULL AND fx_rate_to_usd IS NOT NULL;
  `);

  if (convertedCount.rows[0].count > 0) {
    console.log(
      `\n   ✅ ${convertedCount.rows[0].count} listings with USD conversion`
    );

    const sample = await query(`
      SELECT market, currency, total_native, fx_rate_to_usd, total_usd
      FROM listings
      WHERE total_usd IS NOT NULL
      LIMIT 3;
    `);

    console.log("\n   Sample conversions:");
    for (const row of sample.rows) {
      console.log(
        `     ${row.market} | ${row.currency} ${Number(row.total_native).toFixed(2)} × ${row.fx_rate_to_usd} = USD $${Number(row.total_usd).toFixed(2)}`
      );
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Validation Complete!\n");

  console.log("Next steps:");
  console.log(
    "  1. Run: npx tsx scripts/test-multi-market.ts --market EBAY_CA --limit 5"
  );
  console.log(
    "  2. Run: npx tsx scripts/update-listings.ts --market EBAY_CA --limit 10"
  );
  console.log(
    "  3. Check /cards/[cardId] UI - Market dropdown should show all 4 markets"
  );
  console.log(
    "  4. Verify sorting uses total_usd for cross-market comparison\n"
  );
}

validate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Validation failed:", err);
    process.exit(1);
  });

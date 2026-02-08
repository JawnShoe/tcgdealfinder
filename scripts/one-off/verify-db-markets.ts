#!/usr/bin/env tsx
import { query } from "../lib/db";

async function verifyMarkets() {
  console.log("=== DB REALITY CHECK ===\n");

  // 1. Count by market
  console.log("1. Listings by market:");
  const marketCounts = await query(`
    SELECT market, COUNT(*) as count 
    FROM listings 
    GROUP BY market 
    ORDER BY market
  `);

  for (const row of marketCounts.rows) {
    console.log(`   ${row.market}: ${row.count}`);
  }

  const total = marketCounts.rows.reduce(
    (sum, row) => sum + parseInt(row.count),
    0
  );
  console.log(`   TOTAL: ${total}\n`);

  // 2. Sample non-US listings
  console.log("2. Sample non-US listings:");
  const nonUS = await query(`
    SELECT listing_id, market, currency, total_native, fx_rate_to_usd, total_usd, created_at
    FROM listings 
    WHERE market != 'EBAY_US' 
    ORDER BY created_at DESC 
    LIMIT 10
  `);

  if (nonUS.rows.length === 0) {
    console.log("   ❌ NO NON-US LISTINGS FOUND\n");
  } else {
    console.log(`   ✅ Found ${nonUS.rows.length} non-US listings:\n`);
    for (const row of nonUS.rows) {
      console.log(`   ${row.listing_id}`);
      console.log(`     Market: ${row.market}`);
      console.log(`     Currency: ${row.currency}`);
      console.log(`     Native: ${row.total_native}`);
      console.log(`     FX Rate: ${row.fx_rate_to_usd}`);
      console.log(`     USD: ${row.total_usd}`);
      console.log(`     Created: ${row.created_at}\n`);
    }
  }

  // 3. Currency breakdown
  console.log("3. Currency breakdown:");
  const currencyCounts = await query(`
    SELECT currency, COUNT(*) as count
    FROM listings
    WHERE currency IS NOT NULL
    GROUP BY currency
    ORDER BY currency
  `);

  for (const row of currencyCounts.rows) {
    console.log(`   ${row.currency}: ${row.count}`);
  }

  console.log("\n=== CONCLUSION ===");
  if (nonUS.rows.length === 0) {
    console.log("❌ Problem: Only US listings exist in DB");
    console.log("   → Ingestion is NOT looping markets");
  } else {
    console.log("✅ Multi-market data exists in DB");
    console.log("   → Problem is in UI/query layer");
  }
}

verifyMarkets()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

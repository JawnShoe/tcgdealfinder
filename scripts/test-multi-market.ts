#!/usr/bin/env tsx
/**
 * Test multi-market ingestion
 * 
 * Usage:
 *   npx tsx scripts/test-multi-market.ts
 *   npx tsx scripts/test-multi-market.ts --market EBAY_CA --limit 5
 */

import { fetchEbayListings } from "../lib/ebay";
import { SUPPORTED_MARKETS, getMarketLabel, getExpectedCurrency, type MarketCode } from "../lib/markets";
import { getFXRate } from "../lib/fxRates";
import { query } from "../lib/db";

async function testMarket(market: MarketCode, limit: number = 10) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing Market: ${market} (${getMarketLabel(market)})`);
  console.log(`${"=".repeat(60)}`);
  
  const expectedCurrency = getExpectedCurrency(market);
  console.log(`Expected currency: ${expectedCurrency}`);
  
  // Check FX rate
  const fxRate = await getFXRate(expectedCurrency);
  if (fxRate) {
    console.log(`FX rate to USD: ${fxRate.toFixed(6)}`);
  } else {
    console.log(`❌ NO FX RATE FOUND for ${expectedCurrency}`);
    return;
  }
  
  // Test search query
  const searchQuery = 'pokemon card "charizard"';
  console.log(`\nSearching: "${searchQuery}"`);
  
  try {
    const listings = await fetchEbayListings(searchQuery, market);
    console.log(`Found ${listings.length} listings`);
    
    if (listings.length === 0) {
      console.log("No listings found");
      return;
    }
    
    const sample = listings.slice(0, limit);
    console.log(`\nShowing first ${sample.length} listings:\n`);
    
    for (let i = 0; i < sample.length; i++) {
      const listing = sample[i];
      console.log(`[${i + 1}] ${listing.title}`);
      console.log(`    Price: ${listing.priceCurrency} ${listing.priceCad?.toFixed(2) ?? 'N/A'}`);
      console.log(`    Shipping: ${listing.shippingCurrency ?? listing.priceCurrency} ${listing.shippingCad?.toFixed(2) ?? 'N/A'}`);
      console.log(`    Total: ${listing.totalPriceCad?.toFixed(2) ?? 'N/A'}`);
      if (listing.totalPriceCad && fxRate) {
        const totalUsd = listing.totalPriceCad * fxRate;
        console.log(`    Total USD: $${totalUsd.toFixed(2)}`);
      }
      console.log(`    Market: ${listing.market}`);
      console.log(`    ID: ${listing.listingId}`);
    }
    
  } catch (error) {
    console.error(`❌ Error fetching listings:`, error);
  }
}

async function checkDatabase() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Current Database State");
  console.log(`${"=".repeat(60)}`);
  
  const marketCounts = await query(`
    SELECT market, COUNT(*) as count
    FROM listings
    GROUP BY market
    ORDER BY market;
  `);
  
  console.log("\nListings by market:");
  for (const row of marketCounts.rows) {
    console.log(`  ${row.market}: ${row.count}`);
  }
  
  const currencyCounts = await query(`
    SELECT currency, COUNT(*) as count
    FROM listings
    WHERE currency IS NOT NULL
    GROUP BY currency
    ORDER BY currency;
  `);
  
  console.log("\nListings by currency:");
  for (const row of currencyCounts.rows) {
    console.log(`  ${row.currency}: ${row.count}`);
  }
  
  const sampleListings = await query(`
    SELECT market, currency, price_native, total_native, fx_rate_to_usd, total_usd
    FROM listings
    WHERE currency IS NOT NULL AND total_usd IS NOT NULL
    LIMIT 5;
  `);
  
  console.log("\nSample listings with FX conversion:");
  for (const row of sampleListings.rows) {
    console.log(`  ${row.market} | ${row.currency} ${row.total_native} → USD $${row.total_usd} (rate: ${row.fx_rate_to_usd})`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const marketIndex = args.indexOf("--market");
  const limitIndex = args.indexOf("--limit");
  
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 10;
  
  if (marketIndex !== -1) {
    // Test single market
    const marketStr = args[marketIndex + 1];
    const market = SUPPORTED_MARKETS.find(m => m === marketStr) as MarketCode;
    if (!market) {
      console.error(`Error: Invalid market "${marketStr}"`);
      console.error(`Supported markets: ${SUPPORTED_MARKETS.join(", ")}`);
      process.exit(1);
    }
    await testMarket(market, limit);
  } else {
    // Test all markets
    for (const market of SUPPORTED_MARKETS) {
      await testMarket(market, limit);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  }
  
  // Show DB state
  await checkDatabase();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

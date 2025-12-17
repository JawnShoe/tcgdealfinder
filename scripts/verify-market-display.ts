import "dotenv/config";
import * as db from "../lib/db";
import { formatMarket } from "../lib/dealFormatting";

async function verifyMarketDisplay() {
  console.log("=== MARKET DISTRIBUTION IN DATABASE ===\n");

  // Get market distribution
  const distResult = await db.query(`
    SELECT 
      market,
      COUNT(*) as count
    FROM listings 
    GROUP BY market
    ORDER BY count DESC
  `);

  console.log("Market distribution:");
  console.table(distResult.rows.map(row => ({
    market: row.market,
    count: row.count,
    display: formatMarket(row.market).compactLabel,
    label: formatMarket(row.market).label
  })));

  // Check for any ?? in display
  const hasQuestionMarks = distResult.rows.some(row => 
    formatMarket(row.market).compactLabel === "??"
  );

  console.log(`\n${hasQuestionMarks ? '❌' : '✅'} Any ?? in display: ${hasQuestionMarks ? 'YES - PROBLEM!' : 'NO'}`);

  // Sample some listings from each market
  console.log("\n=== SAMPLE LISTINGS FROM EACH MARKET ===");
  
  for (const row of distResult.rows) {
    const samples = await db.query(`
      SELECT 
        listing_id,
        title,
        market,
        currency
      FROM listings 
      WHERE market = $1
      LIMIT 2
    `, [row.market]);

    console.log(`\n${formatMarket(row.market).label} (${formatMarket(row.market).compactLabel}):`);
    for (const sample of samples.rows) {
      console.log(`  - ${sample.listing_id} | ${sample.currency} | ${sample.title.substring(0, 60)}...`);
    }
  }

  process.exit(0);
}

verifyMarketDisplay().catch(console.error);

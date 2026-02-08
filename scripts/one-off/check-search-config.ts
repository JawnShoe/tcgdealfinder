#!/usr/bin/env tsx
import { query } from "../lib/db";

async function checkConfig() {
  console.log("=== CARD_SEARCH_CONFIG MARKETS ===\n");

  const marketCounts = await query(`
    SELECT market, COUNT(*) as count 
    FROM card_search_config 
    GROUP BY market 
    ORDER BY market
  `);

  console.log("Markets in card_search_config:");
  for (const row of marketCounts.rows) {
    console.log(`  ${row.market}: ${row.count} configs`);
  }

  const activeCount = await query(`
    SELECT market, COUNT(*) as count 
    FROM card_search_config 
    WHERE is_active = TRUE
    GROUP BY market 
    ORDER BY market
  `);

  console.log("\nActive configs only:");
  for (const row of activeCount.rows) {
    console.log(`  ${row.market}: ${row.count} active`);
  }

  const sample = await query(`
    SELECT c.name, cfg.market, cfg.search_query, cfg.is_active
    FROM card_search_config cfg
    JOIN cards c ON c.id = cfg.card_id
    LIMIT 5
  `);

  console.log("\nSample configs:");
  for (const row of sample.rows) {
    console.log(
      `  ${row.name} | ${row.market} | ${row.search_query} | active=${row.is_active}`
    );
  }
}

checkConfig()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

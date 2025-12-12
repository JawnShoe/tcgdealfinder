import { query } from "../lib/db";

async function backfillMarkets(): Promise<void> {
  console.log("Backfilling market columns...");
  await query(
    `
      UPDATE listings
      SET market = 'EBAY_US'
      WHERE market IS NULL OR market = '';
    `,
  );
  await query(
    `
      UPDATE ebay_sold_listings
      SET market = 'EBAY_US'
      WHERE market IS NULL OR market = '';
    `,
  );
  await query(
    `
      UPDATE historical_prices
      SET market = 'EBAY_US'
      WHERE market IS NULL OR market = '';
    `,
  );
  console.log("Market backfill complete.");
}

backfillMarkets().catch((err) => {
  console.error("Failed to backfill market columns:", err);
  process.exit(1);
});

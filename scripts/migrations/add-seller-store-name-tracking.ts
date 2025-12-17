/**
 * Migration: Add seller_store_name tracking columns
 * 
 * Adds:
 * - seller_store_name_source: tracks where the store name came from ('api' | 'html' | null)
 * - seller_store_name_last_checked_at: timestamp of last scrape attempt (for caching)
 */
import { query } from "../../lib/db";

async function migrate() {
  console.log("Adding seller_store_name tracking columns to listings table...\n");

  try {
    // Add source column
    await query(`
      ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS seller_store_name_source TEXT
      CHECK (seller_store_name_source IN ('api', 'html'))
    `, []);
    console.log("✓ Added seller_store_name_source column");

    // Add last_checked_at column
    await query(`
      ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS seller_store_name_last_checked_at TIMESTAMPTZ
    `, []);
    console.log("✓ Added seller_store_name_last_checked_at column");

    // Create index for backfill queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_listings_seller_store_name_backfill
      ON listings (market, seller_store_name_last_checked_at)
      WHERE seller_store_name IS NULL
    `, []);
    console.log("✓ Created index for backfill queries");

    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

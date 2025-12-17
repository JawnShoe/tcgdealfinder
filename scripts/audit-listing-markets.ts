import "dotenv/config";
import * as db from "../lib/db";

async function auditListingMarkets() {
  console.log("=== LISTING MARKET AUDIT ===\n");

  // Count total listings
  const totalResult = await db.query("SELECT COUNT(*) as count FROM listings");
  const total = parseInt(totalResult.rows[0].count);
  console.log(`Total listings: ${total}`);

  // Count NULL markets
  const nullResult = await db.query(
    "SELECT COUNT(*) as count FROM listings WHERE market IS NULL"
  );
  const nullCount = parseInt(nullResult.rows[0].count);
  console.log(`Listings where market IS NULL: ${nullCount}`);

  // Count invalid markets (not in supported list)
  const invalidResult = await db.query(`
    SELECT COUNT(*) as count FROM listings 
    WHERE market IS NOT NULL 
    AND market NOT IN ('EBAY_US', 'EBAY_CA', 'EBAY_GB', 'EBAY_AU')
  `);
  const invalidCount = parseInt(invalidResult.rows[0].count);
  console.log(`Listings where market is invalid (not in supported): ${invalidCount}`);

  console.log(`\nTotal problematic listings: ${nullCount + invalidCount}`);

  // Sample NULL rows
  if (nullCount > 0) {
    console.log("\n=== SAMPLE NULL MARKET ROWS (up to 10) ===");
    const nullSamples = await db.query(`
      SELECT 
        id,
        listing_id,
        title,
        currency,
        created_at
      FROM listings 
      WHERE market IS NULL 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.table(nullSamples.rows.map(row => ({
      id: row.id,
      listing_id: row.listing_id,
      title: row.title?.substring(0, 50) + (row.title?.length > 50 ? '...' : ''),
      currency: row.currency,
      created_at: row.created_at
    })));
  }

  // Sample invalid rows
  if (invalidCount > 0) {
    console.log("\n=== SAMPLE INVALID MARKET ROWS (up to 10) ===");
    const invalidSamples = await db.query(`
      SELECT 
        id,
        listing_id,
        title,
        market,
        currency,
        created_at
      FROM listings 
      WHERE market IS NOT NULL 
      AND market NOT IN ('EBAY_US', 'EBAY_CA', 'EBAY_GB', 'EBAY_AU')
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.table(invalidSamples.rows.map(row => ({
      id: row.id,
      listing_id: row.listing_id,
      title: row.title?.substring(0, 50) + (row.title?.length > 50 ? '...' : ''),
      market: row.market,
      currency: row.currency,
      created_at: row.created_at
    })));
  }

  // Analyze currency distribution for NULL/invalid markets
  console.log("\n=== CURRENCY DISTRIBUTION FOR PROBLEMATIC ROWS ===");
  const currencyDist = await db.query(`
    SELECT 
      currency,
      COUNT(*) as count
    FROM listings 
    WHERE market IS NULL 
      OR market NOT IN ('EBAY_US', 'EBAY_CA', 'EBAY_GB', 'EBAY_AU')
    GROUP BY currency
    ORDER BY count DESC
  `);
  
  if (currencyDist.rows.length > 0) {
    console.table(currencyDist.rows);
  } else {
    console.log("No problematic rows found.");
  }

  // Check schema for marketplace identifier fields
  console.log("\n=== LISTINGS TABLE SCHEMA (relevant columns) ===");
  const schemaResult = await db.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'listings' 
    AND column_name IN ('market', 'marketplace_id', 'currency', 'listing_id')
    ORDER BY ordinal_position
  `);
  console.table(schemaResult.rows);

  process.exit(0);
}

auditListingMarkets().catch(console.error);

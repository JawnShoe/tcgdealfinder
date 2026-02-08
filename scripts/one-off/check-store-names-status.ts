/**
 * Test seller store names after backfill
 */
import { query } from "../lib/db";

async function checkStoreNames() {
  console.log("=== Seller Store Names Status ===\n");

  // Check backfill progress
  const stats = await query<{
    total: number;
    with_store_name: number;
    without_store_name: number;
    checked: number;
  }>(
    `SELECT 
      COUNT(*) as total,
      COUNT(seller_store_name) as with_store_name,
      COUNT(*) - COUNT(seller_store_name) as without_store_name,
      COUNT(seller_store_name_last_checked_at) as checked
     FROM listings 
     WHERE market = 'EBAY_US'`,
    []
  );

  const stat = stats.rows[0];
  console.log("US Market Listings:");
  console.log(`  Total: ${stat.total}`);
  console.log(
    `  With store name: ${stat.with_store_name} (${((stat.with_store_name / stat.total) * 100).toFixed(1)}%)`
  );
  console.log(`  Without store name: ${stat.without_store_name}`);
  console.log(`  Checked (attempted scrape): ${stat.checked}\n`);

  // Show sample store names
  const samples = await query<{
    seller_username: string;
    seller_store_name: string;
    source: string;
  }>(
    `SELECT seller_username, seller_store_name, seller_store_name_source as source
     FROM listings
     WHERE market = 'EBAY_US'
       AND seller_store_name IS NOT NULL
       AND seller_store_name != seller_username
     LIMIT 10`,
    []
  );

  console.log("Sample store names (different from username):");
  for (const s of samples.rows) {
    console.log(
      `  ${s.seller_username} → ${s.seller_store_name} (${s.source})`
    );
  }

  if (samples.rows.length === 0) {
    console.log("  (No store names different from username found yet)");
  }

  console.log("");

  // Show the test case from the spec
  const testCase = await query<{
    listing_id: string;
    seller_username: string;
    seller_store_name: string;
    title: string;
  }>(
    `SELECT listing_id, seller_username, seller_store_name, title
     FROM listings
     WHERE seller_username = 'andre17'
     LIMIT 1`,
    []
  );

  if (testCase.rows.length > 0) {
    const tc = testCase.rows[0];
    console.log("Test case (andre17):");
    console.log(`  Username: ${tc.seller_username}`);
    console.log(`  Store name: ${tc.seller_store_name || "(not set)"}`);
    console.log(`  Listing: ${tc.listing_id}`);

    if (tc.seller_store_name === "brazil shop") {
      console.log("  ✅ PASS: Matches expected 'brazil shop'");
    } else {
      console.log("  ⚠️  Expected 'brazil shop'");
    }
  } else {
    console.log("Test case (andre17): Not found in database");
  }
}

checkStoreNames()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });

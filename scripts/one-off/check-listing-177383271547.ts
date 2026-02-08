/**
 * Check if listing 177383271547 has seller_store_name populated
 */
import { query } from "../lib/db";

async function checkListing() {
  console.log("=== LISTING 177383271547 STATUS ===\n");

  const result = await query<{
    listing_id: string;
    market: string;
    seller_username: string;
    seller_store_name: string | null;
    seller_store_name_source: string | null;
    seller_store_name_last_checked_at: Date | null;
  }>(
    `SELECT 
       listing_id,
       market,
       seller_username,
       seller_store_name,
       seller_store_name_source,
       seller_store_name_last_checked_at
     FROM listings
     WHERE listing_id LIKE '%177383271547%'
       AND market = 'EBAY_US'
     LIMIT 1`,
    []
  );

  if (result.rows.length === 0) {
    console.log("❌ LISTING NOT FOUND IN DATABASE");
    console.log("\nThis listing doesn't exist in the current DB.");
    console.log("Need to run update-listings.ts first to ingest it.");
    return;
  }

  const listing = result.rows[0];

  console.log("Listing ID:", listing.listing_id);
  console.log("Market:", listing.market);
  console.log("Username:", listing.seller_username);
  console.log("Store Name:", listing.seller_store_name || "(NULL)");
  console.log("Source:", listing.seller_store_name_source || "(NULL)");
  console.log(
    "Last Checked:",
    listing.seller_store_name_last_checked_at || "(NULL)"
  );

  console.log("\n---\n");

  if (listing.seller_store_name === "brazil shop") {
    console.log("✅ ENRICHED: Store name = 'brazil shop'");
    console.log("This listing should display correctly in UI.");
  } else if (listing.seller_store_name === null) {
    console.log("❌ NOT ENRICHED: seller_store_name is NULL");
    console.log(
      "\nNeed to run: npx tsx scripts/backfill-seller-store-names.ts"
    );
    console.log("Or manually update this specific listing.");
  } else {
    console.log(`⚠️  UNEXPECTED: Store name = '${listing.seller_store_name}'`);
    console.log("Expected 'brazil shop'");
  }
}

checkListing()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });

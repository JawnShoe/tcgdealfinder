/**
 * Direct DB check for item 177383271547
 * No app code - raw SQL only
 */
import { query } from "../lib/db";

async function main() {
  console.log("\n=== DIRECT DB QUERY for item 177383271547 ===\n");
  
  const result = await query(`
    SELECT 
      listing_id, 
      url, 
      seller_username, 
      seller_store_name,
      seller_store_name_source
    FROM listings 
    WHERE listing_id LIKE '%177383271547%' 
       OR url LIKE '%177383271547%' 
    LIMIT 5
  `);
  
  if (result.rows.length === 0) {
    console.log("❌ NO ROWS FOUND matching 177383271547");
  } else {
    console.log(`Found ${result.rows.length} row(s):\n`);
    result.rows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`);
      console.log(`  listing_id: ${row.listing_id}`);
      console.log(`  url: ${row.url}`);
      console.log(`  seller_username: ${row.seller_username}`);
      console.log(`  seller_store_name: ${row.seller_store_name}`);
      console.log(`  seller_store_name_source: ${row.seller_store_name_source}`);
      console.log();
    });
  }
  
  process.exit(0);
}

main().catch(console.error);

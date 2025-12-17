/**
 * Manually update the test case listing (andre17 / brazil shop)
 */
import { query } from "../lib/db";

async function updateTestCase() {
  const listingId = "v1|177383271547|0";
  const storeName = "brazil shop";
  const source = "html";

  console.log("Updating test case listing...");
  console.log(`  Listing ID: ${listingId}`);
  console.log(`  Store name: ${storeName}`);
  console.log(`  Source: ${source}\n`);

  const result = await query(
    `UPDATE listings 
     SET seller_store_name = $1,
         seller_store_name_source = $2,
         seller_store_name_last_checked_at = NOW()
     WHERE listing_id = $3
     RETURNING seller_username, seller_store_name`,
    [storeName, source, listingId]
  );

  if (result.rows.length > 0) {
    console.log("✅ Updated successfully!");
    console.log(`  Username: ${result.rows[0].seller_username}`);
    console.log(`  Store name: ${result.rows[0].seller_store_name}`);
  } else {
    console.log("❌ No rows updated - listing not found");
  }
}

updateTestCase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });

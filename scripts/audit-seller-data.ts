import "dotenv/config";
import * as db from "../lib/db";

async function auditSellerData() {
  console.log("=== SELLER DATA AUDIT ===\n");
  
  // Count total listings
  const total = await db.query(`SELECT COUNT(*) as count FROM listings`);
  console.log(`Total listings: ${total.rows[0].count}`);
  
  // Count where username exists
  const withUsername = await db.query(`
    SELECT COUNT(*) as count FROM listings WHERE seller_username IS NOT NULL
  `);
  console.log(`With username: ${withUsername.rows[0].count}`);
  
  // Count where store name exists
  const withStoreName = await db.query(`
    SELECT COUNT(*) as count FROM listings WHERE seller_store_name IS NOT NULL
  `);
  console.log(`With store name: ${withStoreName.rows[0].count}`);
  
  // Count where store name ≠ username
  const different = await db.query(`
    SELECT COUNT(*) as count FROM listings 
    WHERE seller_store_name IS NOT NULL 
    AND seller_username IS NOT NULL
    AND LOWER(seller_store_name) != LOWER(seller_username)
  `);
  console.log(`Store name ≠ username: ${different.rows[0].count}`);
  
  // Sample listings with store names
  console.log("\n=== SAMPLE: Store name ≠ username (5 rows) ===");
  const samples = await db.query(`
    SELECT 
      id,
      seller_username,
      seller_store_name,
      LEFT(title, 50) as title
    FROM listings 
    WHERE seller_store_name IS NOT NULL 
    AND seller_username IS NOT NULL
    AND LOWER(seller_store_name) != LOWER(seller_username)
    LIMIT 5
  `);
  console.table(samples.rows);
  
  // Sample listings without store names
  console.log("\n=== SAMPLE: No store name (5 rows) ===");
  const noStore = await db.query(`
    SELECT 
      id,
      seller_username,
      seller_store_name,
      LEFT(title, 50) as title
    FROM listings 
    WHERE seller_store_name IS NULL
    AND seller_username IS NOT NULL
    LIMIT 5
  `);
  console.table(noStore.rows);
  
  process.exit(0);
}

auditSellerData();

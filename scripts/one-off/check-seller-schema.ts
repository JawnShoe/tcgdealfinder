import "dotenv/config";
import * as db from "../lib/db";

async function checkSellerColumns() {
  const res = await db.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'listings' 
    AND column_name LIKE '%seller%' 
    ORDER BY ordinal_position
  `);

  console.log("=== SELLER COLUMNS IN LISTINGS TABLE ===");
  console.table(res.rows);

  process.exit(0);
}

checkSellerColumns();

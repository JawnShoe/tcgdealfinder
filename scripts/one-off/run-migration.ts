import { query } from "./lib/db";
import * as fs from "fs";

async function runMigration() {
  const sql = fs.readFileSync("./migrations/001_add_fx_rates.sql", "utf8");
  
  console.log("Running migration: 001_add_fx_rates.sql");
  
  try {
    await query(sql);
    console.log(" Migration completed successfully");
    
    // Verify
    const fxCheck = await query(`SELECT currency, rate_to_usd FROM fx_rates ORDER BY currency;`);
    console.log("\nFX Rates:");
    for (const row of fxCheck.rows) {
      console.log(`  ${row.currency}: ${row.rate_to_usd}`);
    }
    
    const colCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'listings' 
        AND column_name IN ('currency', 'price_native', 'total_usd', 'fx_rate_to_usd')
      ORDER BY column_name;
    `);
    console.log("\nNew listings columns:");
    for (const row of colCheck.rows) {
      console.log(`  ${row.column_name}`);
    }
    
  } catch (error) {
    console.error(" Migration failed:", error);
    process.exit(1);
  }
}

runMigration().then(() => process.exit(0));

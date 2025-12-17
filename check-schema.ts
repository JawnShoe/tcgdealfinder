import { query } from "./lib/db";

async function checkSchema() {
  // Check listings table columns
  const listingsCols = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'listings'
    ORDER BY ordinal_position;
  `);
  
  console.log("LISTINGS TABLE COLUMNS:");
  for (const col of listingsCols.rows) {
    console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
  }
  
  // Check if we have any market-related data
  const marketCheck = await query(`SELECT DISTINCT market FROM listings LIMIT 5;`);
  console.log("\nEXISTING MARKET VALUES:");
  for (const row of marketCheck.rows) {
    console.log(`  ${row.market}`);
  }
  
  // Check listings constraints
  const constraints = await query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'listings';
  `);
  console.log("\nLISTINGS CONSTRAINTS:");
  for (const c of constraints.rows) {
    console.log(`  ${c.constraint_name} (${c.constraint_type})`);
  }
}

checkSchema().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

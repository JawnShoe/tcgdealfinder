#!/usr/bin/env tsx
import { query } from "../lib/db";

async function check() {
  const cols = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'listings'
    AND (column_name LIKE '%collector%' OR column_name LIKE '%language%')
    ORDER BY column_name
  `);
  
  console.log("Collector/language columns in listings:");
  for (const row of cols.rows) {
    console.log(`  ${row.column_name}`);
  }
  
  if (cols.rows.length === 0) {
    console.log("  (none found)");
  }
}

check().then(() => process.exit(0));

#!/usr/bin/env tsx
import { query } from "../lib/db";

async function checkSchema() {
  const cols = await query<{ column_name: string }>(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'cards' 
    ORDER BY ordinal_position
  `);
  
  console.log("Cards table columns:");
  for (const row of cols.rows) {
    console.log(`  ${row.column_name}`);
  }
}

checkSchema().then(() => process.exit(0));

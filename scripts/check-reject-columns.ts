#!/usr/bin/env tsx
import { query } from "../lib/db";

async function check() {
  const cols = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'listings' 
    AND column_name LIKE '%reject%'
    ORDER BY column_name
  `);
  
  console.log("Reject columns in listings:");
  for (const row of cols.rows) {
    console.log(`  ${row.column_name}`);
  }
}

check().then(() => process.exit(0));

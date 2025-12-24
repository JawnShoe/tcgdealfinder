import { query } from "./lib/db";

async function check() {
  const result = await query(`
    SELECT name, set_name, card_number
    FROM cards
    WHERE name ILIKE '%giratina%'
    LIMIT 5
  `);
  
  console.log(`Giratina cards in app database:`);
  for (const row of result.rows) {
    console.log(`  ${row.name} | ${row.set_name} | #${row.card_number}`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

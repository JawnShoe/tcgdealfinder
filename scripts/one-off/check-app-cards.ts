import { query } from "./lib/db";

async function check() {
  const appCards = await query(`
    SELECT DISTINCT name, set_name, card_number
    FROM cards
    WHERE (name ILIKE '%lugia%' OR name ILIKE '%giratina%')
      AND card_number IS NOT NULL
    ORDER BY name
  `);

  console.log("Cards in app DB:");
  for (const row of appCards.rows) {
    console.log(`  ${row.name} | ${row.set_name} | #${row.card_number}`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

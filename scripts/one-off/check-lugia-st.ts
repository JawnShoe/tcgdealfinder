import { query } from "./lib/db";

async function check() {
  const cards = await query(`
    SELECT cc.name, cc.number, cs.name as set_name
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cs.name ILIKE '%silver%tempest%'
      AND cc.name ILIKE '%lugia%'
    ORDER BY cs.name, cc.number
  `);
  
  console.log(`Lugia cards in Silver Tempest sets:`);
  for (const row of cards.rows) {
    console.log(`  #${row.number} ${row.name} (${row.set_name})`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

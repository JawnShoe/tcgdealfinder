import { query } from "./lib/db";

async function check() {
  const tg = await query(`
    SELECT cc.name, cc.number
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cs.name = 'Silver Tempest Trainer Gallery'
    ORDER BY cc.number
  `);
  
  console.log(`Silver Tempest Trainer Gallery (${tg.rows.length} cards):`);
  for (const row of tg.rows) {
    console.log(`  #${row.number} ${row.name}`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

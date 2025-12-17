import { query } from "./lib/db";

async function check() {
  const empty = await query(`
    SELECT cs.name, cs.pokemontcg_io_set_id
    FROM catalog_sets cs
    LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
    GROUP BY cs.id
    HAVING COUNT(cc.id) = 0
    ORDER BY cs.name
  `);
  
  console.log(`Empty sets remaining (${empty.rows.length}):`);
  for (const row of empty.rows) {
    console.log(`  ${row.name} (${row.pokemontcg_io_set_id})`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

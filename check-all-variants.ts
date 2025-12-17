import { query } from "./lib/db";

async function check() {
  // Check for any Lugia in Silver Tempest
  const lugia = await query(`
    SELECT cc.name, cc.number, cs.name as set_name, cs.pokemontcg_io_set_id
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cs.name ILIKE '%silver%tempest%'
      AND cc.name ILIKE '%lugia%'
    ORDER BY cc.number
  `);
  
  console.log("All Lugia in Silver Tempest sets:");
  for (const row of lugia.rows) {
    console.log(`  ${row.name} #${row.number} (${row.set_name}, ${row.pokemontcg_io_set_id})`);
  }
  
  // Check for any Giratina in Lost Origin
  const giratina = await query(`
    SELECT cc.name, cc.number, cs.name as set_name, cs.pokemontcg_io_set_id
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cs.name ILIKE '%lost%origin%'
      AND cc.name ILIKE '%giratina%'
    ORDER BY cc.number
  `);
  
  console.log("\nAll Giratina in Lost Origin sets:");
  for (const row of giratina.rows) {
    console.log(`  ${row.name} #${row.number} (${row.set_name}, ${row.pokemontcg_io_set_id})`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

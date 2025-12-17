import { query } from "./lib/db";

async function check() {
  const lugia = await query(`
    SELECT cc.name, cc.number, cs.name as set_name
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cs.name ILIKE '%silver%tempest%'
      AND cc.name ILIKE '%lugia%'
      AND cc.number LIKE '%186%'
  `);
  
  console.log("Lugia in Silver Tempest:");
  for (const row of lugia.rows) {
    console.log(`  ${row.name} #${row.number} (${row.set_name})`);
  }
  
  const giratina = await query(`
    SELECT cc.name, cc.number, cs.name as set_name
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cs.name ILIKE '%lost%origin%'
      AND cc.name ILIKE '%giratina%'
      AND cc.number LIKE '%186%'
  `);
  
  console.log("\nGiratina in Lost Origin:");
  for (const row of giratina.rows) {
    console.log(`  ${row.name} #${row.number} (${row.set_name})`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

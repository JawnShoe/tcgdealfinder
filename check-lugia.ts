import { query } from "./lib/db";

async function check() {
  // Check for TG sets
  const tg = await query(`
    SELECT name, pokemontcg_io_set_id
    FROM catalog_sets
    WHERE name ILIKE '%trainer%gallery%' OR name ILIKE '%silver%tempest%'
    ORDER BY name
  `);
  
  console.log("Trainer Gallery and Silver Tempest sets:");
  for (const row of tg.rows) {
    console.log(`  ${row.name} (${row.pokemontcg_io_set_id})`);
  }
  
  // Search for ANY Lugia
  const lugia = await query(`
    SELECT cc.name, cc.number, cs.name as set_name
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    WHERE cc.name ILIKE '%lugia%'
    ORDER BY cs.name, cc.number
  `);
  
  console.log("\nAll Lugia cards in catalog:");
  for (const row of lugia.rows) {
    console.log(`  ${row.name} #${row.number} (${row.set_name})`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

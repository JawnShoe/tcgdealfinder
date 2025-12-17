import { query } from "./lib/db";

async function check() {
  const sets = await query(`SELECT COUNT(*) FROM catalog_sets`);
  const cards = await query(`SELECT COUNT(*) FROM catalog_cards`);
  const withImages = await query(`SELECT COUNT(*) FROM catalog_cards WHERE image_url IS NOT NULL`);
  
  console.log("=== FINAL DATABASE STATE ===");
  console.log(`Sets: ${sets.rows[0].count}`);
  console.log(`Cards: ${cards.rows[0].count}`);
  console.log(`Cards with images: ${withImages.rows[0].count}`);
  
  const silverTempest = await query(`SELECT name, pokemontcg_io_set_id FROM catalog_sets WHERE name ILIKE '%silver%tempest%'`);
  console.log(`\nSilver Tempest: ${silverTempest.rows.length > 0 ? " IMPORTED" : " MISSING"}`);
  if (silverTempest.rows.length > 0) {
    console.log(`  ${silverTempest.rows[0].name} (${silverTempest.rows[0].pokemontcg_io_set_id})`);
  }
  
  const lostOrigin = await query(`SELECT name FROM catalog_sets WHERE name ILIKE '%lost%origin%'`);
  console.log(`Lost Origin: ${lostOrigin.rows.length > 0 ? " IMPORTED" : " MISSING"}`);
  if (lostOrigin.rows.length > 0) {
    console.log(`  ${lostOrigin.rows[0].name}`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

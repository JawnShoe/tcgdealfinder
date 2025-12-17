import { query } from "./lib/db";

async function verifyDB() {
  console.log("=== DATABASE STATE ===\n");
  
  const setsCount = await query(`SELECT COUNT(*) as count FROM catalog_sets`);
  const cardsCount = await query(`SELECT COUNT(*) as count FROM catalog_cards`);
  const cardsWithImages = await query(`SELECT COUNT(*) as count FROM catalog_cards WHERE image_url IS NOT NULL`);
  
  console.log("Counts:");
  console.log(`  catalog_sets: ${setsCount.rows[0].count}`);
  console.log(`  catalog_cards: ${cardsCount.rows[0].count}`);
  console.log(`  cards with image_url: ${cardsWithImages.rows[0].count}`);
  
  const samples = await query(`
    SELECT 
      cs.name as set_name,
      cc.name as card_name,
      cc.number,
      cc.image_url
    FROM catalog_cards cc
    JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
    ORDER BY cc.id
    LIMIT 5
  `);
  
  console.log("\nSample rows:");
  if (samples.rows.length === 0) {
    console.log("  (no data)");
  } else {
    for (const row of samples.rows) {
      console.log(`  ${row.set_name} | ${row.card_name} | #${row.number} | ${row.image_url ? row.image_url.substring(0, 60) + "..." : "NULL"}`);
    }
  }
}

verifyDB().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

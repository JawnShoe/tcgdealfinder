import { query } from "./lib/db";

async function checkProgress() {
  const setsCount = await query(`SELECT COUNT(*) as count FROM catalog_sets`);
  const cardsCount = await query(`SELECT COUNT(*) as count FROM catalog_cards`);
  const cardsWithImages = await query(`SELECT COUNT(*) as count FROM catalog_cards WHERE image_url IS NOT NULL`);
  
  console.log("Current database state:");
  console.log(`  Sets: ${setsCount.rows[0].count}`);
  console.log(`  Cards: ${cardsCount.rows[0].count}`);
  console.log(`  Cards with images: ${cardsWithImages.rows[0].count}`);
}

checkProgress().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

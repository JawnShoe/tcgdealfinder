import "dotenv/config";
import { query } from "../lib/db";

async function testSetup() {
  console.log("=== SETUP VERIFICATION ===\n");
  
  // 1. Check API key
  if (process.env.POKEMONTCG_IO_API_KEY) {
    console.log("✅ POKEMONTCG_IO_API_KEY is configured");
  } else {
    console.log("❌ POKEMONTCG_IO_API_KEY is NOT SET");
    console.log("   Add to .env.local: POKEMONTCG_IO_API_KEY=your_key_here");
    console.log("   Get one at: https://pokemontcg.io\n");
  }
  
  // 2. Check schema
  const setsCheck = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'catalog_sets' 
    ORDER BY ordinal_position
  `);
  
  const cardsCheck = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'catalog_cards' 
    ORDER BY ordinal_position
  `);
  
  console.log("✅ catalog_sets columns:", setsCheck.rows.map(r => r.column_name).join(", "));
  console.log("✅ catalog_cards columns:", cardsCheck.rows.map(r => r.column_name).join(", "));
  
  // 3. Check current data
  const setsCount = await query(`SELECT COUNT(*) as count FROM catalog_sets`);
  const cardsCount = await query(`SELECT COUNT(*) as count FROM catalog_cards`);
  const cardsWithImages = await query(`SELECT COUNT(*) as count FROM catalog_cards WHERE image_url IS NOT NULL`);
  
  console.log(`\n📊 Current data:`);
  console.log(`   catalog_sets: ${setsCount.rows[0].count} rows`);
  console.log(`   catalog_cards: ${cardsCount.rows[0].count} rows`);
  console.log(`   cards with images: ${cardsWithImages.rows[0].count} rows`);
  
  // 4. Sample app cards for testing
  const appCards = await query(`
    SELECT DISTINCT name, set_name, card_number
    FROM cards
    WHERE card_number IS NOT NULL
    ORDER BY name
    LIMIT 5
  `);
  
  console.log(`\n🃏 Sample cards from your app (for testing after import):`);
  for (const card of appCards.rows) {
    console.log(`   - ${card.name} | ${card.set_name} | #${card.card_number}`);
  }
  
  console.log("\n✅ Setup check complete!");
  if (!process.env.POKEMONTCG_IO_API_KEY) {
    console.log("\n⚠️  Add POKEMONTCG_IO_API_KEY to .env.local, then run:");
    console.log("   npx tsx scripts/import-pokemontcg-catalog.ts");
  } else {
    console.log("\n✅ Ready to import! Run:");
    console.log("   npx tsx scripts/import-pokemontcg-catalog.ts");
  }
}

testSetup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });

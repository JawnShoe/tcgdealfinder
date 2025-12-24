import { query } from "./lib/db";

async function verify() {
  const sets = await query(`SELECT COUNT(*) as count FROM catalog_sets`);
  const cards = await query(`SELECT COUNT(*) as count FROM catalog_cards`);
  const withImages = await query(`SELECT COUNT(*) as count FROM catalog_cards WHERE image_url IS NOT NULL`);
  const empty = await query(`
    SELECT COUNT(*) as count 
    FROM catalog_sets cs
    LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
    GROUP BY cs.id
    HAVING COUNT(cc.id) = 0
  `);
  
  console.log(`Final Import Status:`);
  console.log(`  Sets: ${sets.rows[0].count}`);
  console.log(`  Cards: ${cards.rows[0].count}`);
  console.log(`  Cards with images: ${withImages.rows[0].count}`);
  console.log(`  Empty sets remaining: ${empty.rows.length}`);
  
  // Check specific sets
  const silverTempest = await query(`
    SELECT COUNT(cc.id) as card_count
    FROM catalog_sets cs
    LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
    WHERE cs.name = 'Silver Tempest'
    GROUP BY cs.id
  `);
  
  const stTG = await query(`
    SELECT COUNT(cc.id) as card_count
    FROM catalog_sets cs
    LEFT JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
    WHERE cs.name = 'Silver Tempest Trainer Gallery'
    GROUP BY cs.id
  `);
  
  console.log(`\n  Silver Tempest: ${silverTempest.rows[0]?.card_count ?? 0} cards`);
  console.log(`  Silver Tempest TG: ${stTG.rows[0]?.card_count ?? 0} cards`);
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

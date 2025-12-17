import { query } from "./lib/db";

async function test() {
  // 1. Count catalog_cards (source of stock images)
  const catalogCount = await query(`
    SELECT COUNT(*) as count FROM catalog_cards
  `);
  console.log("=== CATALOG STATUS ===");
  console.log("catalog_cards rows:", catalogCount.rows[0].count);
  
  const catalogWithImages = await query(`
    SELECT COUNT(*) as count FROM catalog_cards WHERE image_url IS NOT NULL
  `);
  console.log("catalog_cards with image_url:", catalogWithImages.rows[0].count);

  // 2. Check top deals table structure
  console.log("\n=== TOP DEALS SAMPLE ===");
  const topDeals = await query(`
    SELECT 
      l.id,
      c.id as card_id,
      c.name,
      c.set_name,
      c.card_number,
      l.thumbnail_url,
      l.discount_percent,
      l.total_price_cad
    FROM listings l
    JOIN cards c ON c.id = l.card_id
    WHERE l.discount_percent IS NOT NULL
      AND l.discount_percent < 0
      AND l.match_eligible = TRUE
    ORDER BY l.discount_percent ASC
    LIMIT 3
  `);
  
  console.log("Top 3 deals:");
  for (const deal of topDeals.rows) {
    console.log(JSON.stringify(deal, null, 2));
  }

  // 3. Try to resolve stock image for first deal
  if (topDeals.rows.length > 0) {
    const firstDeal = topDeals.rows[0];
    console.log("\n=== STOCK IMAGE RESOLUTION TEST ===");
    console.log(`Card: ${firstDeal.name} (${firstDeal.set_name})`);
    console.log(`Card number: ${firstDeal.card_number}`);
    
    const stockMatch = await query(`
      SELECT cc.image_url
      FROM catalog_cards cc
      JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
      WHERE cs.name ILIKE $1
        AND cc.name ILIKE $2
        ${firstDeal.card_number ? "AND cc.number = $3" : ""}
        AND cc.image_url IS NOT NULL
    `, firstDeal.card_number 
      ? [firstDeal.set_name, firstDeal.name, firstDeal.card_number]
      : [firstDeal.set_name, firstDeal.name]
    );
    
    console.log("Stock image matches:", stockMatch.rows.length);
    if (stockMatch.rows.length > 0) {
      console.log("Stock image URL:", stockMatch.rows[0].image_url);
    } else {
      console.log("Stock image URL: null (no match)");
    }
    console.log("Fallback to listing thumbnail:", firstDeal.thumbnail_url);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

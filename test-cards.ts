import { query } from "./lib/db";

async function test() {
  // Check catalog_cards table
  const catalogCheck = await query(`
    SELECT COUNT(*) as count FROM catalog_cards
  `);
  console.log("catalog_cards count:", catalogCheck.rows[0]);

  // Check cards table with images
  const cardsCheck = await query(`
    SELECT id, name, set_name, card_number
    FROM cards
    WHERE id IN (
      SELECT DISTINCT card_id FROM listings WHERE thumbnail_url IS NOT NULL LIMIT 5
    )
    LIMIT 3
  `);
  console.log("\nSample cards from cards table:");
  console.log(JSON.stringify(cardsCheck.rows, null, 2));
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

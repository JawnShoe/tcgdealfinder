import { query } from "./lib/db";

async function addColumns() {
  await query(`
    ALTER TABLE catalog_sets 
      ADD COLUMN IF NOT EXISTS pokemontcg_io_set_id TEXT UNIQUE;
    
    ALTER TABLE catalog_cards 
      ADD COLUMN IF NOT EXISTS pokemontcg_io_card_id TEXT UNIQUE;
  `);
  console.log("Schema updated with PokémonTCG.io ID columns");
}

addColumns().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

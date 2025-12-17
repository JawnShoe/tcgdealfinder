import { query } from "./lib/db";

async function check() {
  const result = await query(`
    SELECT cs.name, cs.pokemontcg_io_set_id, COUNT(*) as card_count
    FROM catalog_sets cs
    JOIN catalog_cards cc ON cc.catalog_set_id = cs.id
    WHERE cs.name ILIKE '%shining%' OR cs.name ILIKE '%silver%' OR cs.name ILIKE '%vault%' OR cs.name ILIKE '%gallery%'
    GROUP BY cs.name, cs.pokemontcg_io_set_id
    ORDER BY cs.name
  `);

  console.log("Subset/Target sets in catalog:");
  for (const row of result.rows) {
    console.log(`  ${row.name} (${row.pokemontcg_io_set_id}) - ${row.card_count} cards`);
  }

  const appCards = await query(`
    SELECT DISTINCT set_name, card_number
    FROM cards
    WHERE (set_name ILIKE '%shining%' OR set_name ILIKE '%silver%')
      AND card_number IS NOT NULL
    ORDER BY set_name, card_number
    LIMIT 10
  `);

  console.log("\nCards in app (shining/silver):");
  for (const row of appCards.rows) {
    console.log(`  ${row.set_name} #${row.card_number}`);
  }
  
  const allSets = await query(`SELECT name FROM catalog_sets ORDER BY name`);
  console.log(`\nTotal sets imported: ${allSets.rows.length}`);
  console.log("Sample sets:", allSets.rows.slice(0, 5).map(r => r.name).join(", "));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

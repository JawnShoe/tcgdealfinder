import { query } from "../lib/db";
async function check() {
  const sets = await query(`SELECT COUNT(*) FROM catalog_sets`);
  const cards = await query(`SELECT COUNT(*) FROM catalog_cards`);
  console.log("Progress - Sets:", sets.rows[0].count, "| Cards:", cards.rows[0].count);
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

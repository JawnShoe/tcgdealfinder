import { query } from "../lib/db";
const sets = await query(`SELECT COUNT(*) FROM catalog_sets`);
const cards = await query(`SELECT COUNT(*) FROM catalog_cards`);
console.log("Sets:", sets.rows[0].count, "| Cards:", cards.rows[0].count);

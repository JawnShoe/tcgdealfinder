import { query } from "./lib/db.js";

const result = await query(`
  SELECT cc.id, cc.name, cc.number, cs.name as set_name, cc.image_url
  FROM catalog_cards cc
  JOIN catalog_sets cs ON cs.id = cc.catalog_set_id
  WHERE cc.image_url IS NOT NULL
  LIMIT 5
`);

console.log(JSON.stringify(result.rows, null, 2));
process.exit(0);

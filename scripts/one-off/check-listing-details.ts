import { query } from "../lib/db";

async function main() {
  const r = await query(
    `SELECT card_id, title, price_native, total_usd, ends_at, match_eligible 
     FROM listings 
     WHERE listing_id LIKE '%177383271547%' 
     LIMIT 1`,
    []
  );

  console.log("Listing details:");
  console.log(r.rows[0]);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

import { query } from "../lib/db";

async function main() {
  const res = await query(
    `SELECT listing_id, seller_username, seller_store_name 
     FROM listings 
     WHERE listing_id LIKE '%177383271547%' OR seller_username = 'andre17' 
     LIMIT 5`,
    []
  );

  console.log("Test case listings:");
  console.log(res.rows);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

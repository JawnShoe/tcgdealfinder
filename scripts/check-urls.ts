import { query } from "../lib/db";

async function main() {
  const res = await query(
    "SELECT listing_id, url, market, currency, total_native, total_usd FROM listings WHERE listing_id LIKE '%177383271547%'"
  );
  for (const row of res.rows) {
    console.log(`${row.market}: ${row.url}`);
    console.log(`  Currency: ${row.currency}, Native: ${row.total_native}, USD: ${row.total_usd}`);
    console.log();
  }
}

main();

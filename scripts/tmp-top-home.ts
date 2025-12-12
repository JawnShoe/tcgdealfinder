import { query } from "../lib/db";

async function main() {
  const res = await query(
    `
      SELECT
        l.listing_id,
        l.discount_percent,
        l.total_price_cad,
        l.match_eligible,
        l.shipping_known
      FROM listings l
      LEFT JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
      WHERE
        l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
        AND l.match_eligible = TRUE
        AND l.shipping_known = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY
        l.discount_percent ASC NULLS LAST,
        l.total_price_cad ASC,
        l.ends_at ASC NULLS LAST
      LIMIT 10;
    `,
  );
  console.log(res.rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

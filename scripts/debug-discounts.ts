import { query } from "../lib/db";
import { getDisplayDiscountPercent } from "../lib/pricing";

async function main() {
  const res = await query<{
    listing_id: number;
    card_id: number;
    card_name: string;
    set_name: string;
    card_number: string | null;
    total_price_cad: string | null;
    historic_price_cad: string | null;
    discount_percent: string | null;
    seller_username: string | null;
    seller_feedback_count: number | null;
    seller_positive_percent: string | null;
  }>(
    `
      SELECT
        l.id AS listing_id,
        l.card_id,
        c.name AS card_name,
        c.set_name,
        c.card_number,
        l.total_price_cad,
        l.historic_price_cad,
        l.discount_percent,
        l.seller_username,
        l.seller_feedback_count,
        l.seller_positive_percent
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      WHERE
        l.discount_percent IS NOT NULL
        AND (l.discount_percent > 80 OR l.discount_percent < -80)
      ORDER BY l.discount_percent ASC
      LIMIT 100;
    `,
  );

  if (res.rowCount === 0) {
    console.log("No listings with |discount_percent| > 80%.");
    return;
  }

  for (const row of res.rows) {
    const total = row.total_price_cad != null ? Number(row.total_price_cad) : null;
    const historic = row.historic_price_cad != null ? Number(row.historic_price_cad) : null;
    const raw = row.discount_percent != null ? Number(row.discount_percent) : null;
    const display = getDisplayDiscountPercent({
      discount_percent: raw,
      seller_feedback_count: row.seller_feedback_count ?? null,
      seller_positive_percent:
        row.seller_positive_percent != null
          ? Number(row.seller_positive_percent)
          : null,
    });

    console.log(
      `Listing #${row.listing_id} – ${row.card_name} (${row.set_name} ${row.card_number ?? ""})`,
    );
    console.log(
      `  total=${total ?? "?"}, historic=${historic ?? "?"}, raw=${raw ?? "?"}% display=${display ?? "?"}%`,
    );
    console.log(
      `  seller=${row.seller_username ?? "unknown"} (${row.seller_feedback_count ?? "?"} fb / ${row.seller_positive_percent ?? "?"}% )`,
    );
  }
}

main().catch((err) => {
  console.error("Failed to debug discounts:", err);
  process.exit(1);
});

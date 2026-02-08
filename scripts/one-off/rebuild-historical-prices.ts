import { query } from "../lib/db";

type CardRow = {
  id: number;
  name: string;
  set_name: string;
  card_number: string;
  condition_bucket: string;
};

async function main() {
  console.log("Rebuilding historical prices from listings…");

  const cardsRes = await query<CardRow>(
    `
      SELECT id, name, set_name, card_number, condition_bucket
      FROM cards
      ORDER BY id;
    `
  );

  for (const card of cardsRes.rows) {
    const pricesRes = await query<{
      total_price_cad: string | null;
      title: string;
    }>(
      `
        SELECT total_price_cad, title
        FROM listings
        WHERE card_id = $1
          AND total_price_cad IS NOT NULL
          AND total_price_cad > 0
        ORDER BY created_at DESC
        LIMIT 200;
      `,
      [card.id]
    );

    const rawPrices = pricesRes.rows
      .map((row) => Number(row.total_price_cad))
      .filter((v) => Number.isFinite(v) && v > 0);

    if (rawPrices.length < 5) {
      console.log(
        `Skipping card ${card.id} (${card.name} ${card.condition_bucket}) – only ${rawPrices.length} samples`
      );
      continue;
    }

    // Sort ascending
    rawPrices.sort((a, b) => a - b);

    // Trim 10% from each side to drop weird outliers
    const trim = Math.floor(rawPrices.length * 0.1);
    const trimmed =
      trim > 0 ? rawPrices.slice(trim, rawPrices.length - trim) : rawPrices;

    const n = trimmed.length;
    const median =
      n % 2 === 1
        ? trimmed[(n - 1) / 2]
        : (trimmed[n / 2 - 1] + trimmed[n / 2]) / 2;

    await query(
      `
        INSERT INTO historical_prices (card_id, median_price_cad, sample_size, last_updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (card_id) DO UPDATE
        SET median_price_cad = EXCLUDED.median_price_cad,
            sample_size     = EXCLUDED.sample_size,
            last_updated_at = NOW();
      `,
      [card.id, median, n]
    );

    console.log(
      `Updated card ${card.id} (${card.name} ${card.condition_bucket}): median $${median.toFixed(
        2
      )} from ${n} samples.`
    );
  }

  console.log("Historical price rebuild complete.");
}

main().catch((err) => {
  console.error("Failed to rebuild historical prices:", err);
  process.exit(1);
});

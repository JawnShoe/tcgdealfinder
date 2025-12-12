import { query } from "../lib/db";
import {
  extractCollectorNumber,
  normalizeCollectorNumber,
  type CollectorNumberConfidence,
} from "../lib/collectorNumber";

async function backfillCards(): Promise<void> {
  const res = await query<{
    id: number;
    card_number: string | null;
    collector_number_raw: string | null;
    collector_number_norm: string | null;
    collector_number_confidence: string | null;
  }>(`
    SELECT
      id,
      card_number,
      collector_number_raw,
      collector_number_norm,
      collector_number_confidence
    FROM cards;
  `);

  for (const row of res.rows) {
    const raw = row.card_number ?? null;
    const norm = normalizeCollectorNumber(raw);
    const confidence: CollectorNumberConfidence = norm ? "HIGH" : "NONE";
    await query(
      `
        UPDATE cards
        SET
          collector_number_raw = $1,
          collector_number_norm = $2,
          collector_number_confidence = $3,
          collector_number_signals = CASE WHEN $2 IS NOT NULL THEN ARRAY['catalog'] ELSE ARRAY[]::text[] END
        WHERE id = $4;
      `,
      [raw, norm, confidence, row.id],
    );
  }
  console.log(`Updated collector numbers for ${res.rows.length} cards.`);
}

async function backfillListings(): Promise<void> {
  const batchSize = 200;
  let lastId = 0;
  let processed = 0;

  while (true) {
    const res = await query<{
      id: number;
      title: string;
    }>(
      `
        SELECT id, title
        FROM listings
        WHERE id > $1
        ORDER BY id
        LIMIT $2;
      `,
      [lastId, batchSize],
    );
    if (res.rows.length === 0) {
      break;
    }
    for (const row of res.rows) {
      const cn = extractCollectorNumber({ title: row.title ?? "" });
      await query(
        `
          UPDATE listings
          SET
            collector_number_raw = $1,
            collector_number_norm = $2,
            collector_number_confidence = $3,
            collector_number_signals = $4,
            detected_collector_number = $2
          WHERE id = $5;
        `,
        [cn.raw, cn.norm, cn.confidence, cn.signals, row.id],
      );
      lastId = row.id;
      processed += 1;
    }
    console.log(`Processed ${processed} listings so far...`);
  }

  console.log(`Backfilled collector numbers for ${processed} listings.`);
}

async function main() {
  await backfillCards();
  await backfillListings();
  console.log("Collector number backfill complete.");
}

main().catch((err) => {
  console.error("Collector number backfill failed:", err);
  process.exitCode = 1;
});

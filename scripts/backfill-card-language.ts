import "dotenv/config";
import { query } from "../lib/db";
import { detectCardLanguage } from "../lib/rebuild/scripts/language";

type CardRow = {
  id: number;
  name: string;
  language: string | null;
};

async function fetchCards(): Promise<CardRow[]> {
  const res = await query<CardRow>(
    `
      SELECT id, name, language
      FROM cards;
    `
  );
  return res.rows;
}

async function updateCardLanguage(
  cardId: number,
  language: string
): Promise<void> {
  await query(
    `
      UPDATE cards
      SET language = $1,
          updated_at = NOW()
      WHERE id = $2;
    `,
    [language, cardId]
  );
}

async function backfill(): Promise<void> {
  const cards = await fetchCards();
  let updated = 0;

  for (const card of cards) {
    const detection = detectCardLanguage(card.name);
    const normalized = detection.lang ?? "UNKNOWN";
    if ((card.language ?? "UNKNOWN") !== normalized) {
      await updateCardLanguage(card.id, normalized);
      updated += 1;
    }
  }

  console.log(`Card language backfill complete. Updated ${updated} cards.`);
}

backfill().catch((err) => {
  console.error("Failed to backfill card languages:", err);
  process.exitCode = 1;
});

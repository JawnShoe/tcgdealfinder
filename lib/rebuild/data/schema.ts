import { queryRebuild } from "../db";

let cardsLanguageColumnCache: boolean | null = null;

export async function ensureRebuildCardsLanguageColumn(): Promise<boolean> {
  if (cardsLanguageColumnCache != null) {
    return cardsLanguageColumnCache;
  }
  cardsLanguageColumnCache = await hasColumn("cards", "language");
  return cardsLanguageColumnCache;
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  try {
    const res = await queryRebuild<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = $1
            AND column_name = $2
        ) AS exists;
      `,
      [table, column]
    );
    return Boolean(res.rows[0]?.exists);
  } catch {
    return false;
  }
}

import { queryRebuild } from "../db";

let cardsLanguageColumnCache: boolean | null = null;

type SchemaDegradedContext = {
  route?: string;
  requestId?: string;
};

const schemaDegradedRequestDedupe = new Set<string>();

function logSchemaDegradedOnce(
  context: SchemaDegradedContext | undefined,
  missingFields: string[]
) {
  const requestId = context?.requestId?.trim();
  const route = context?.route?.trim();
  if (!requestId || !route) return;

  const key = `${requestId}::${route}`;
  if (schemaDegradedRequestDedupe.has(key)) return;

  schemaDegradedRequestDedupe.add(key);
  if (schemaDegradedRequestDedupe.size > 500) {
    schemaDegradedRequestDedupe.clear();
  }

  console.log(
    JSON.stringify({
      level: "warn",
      event: "rebuild.schema_degraded",
      ts: new Date().toISOString(),
      route,
      requestId,
      missingFields,
      degradedMode: true,
    })
  );
}

export async function ensureRebuildCardsLanguageColumn(
  context?: SchemaDegradedContext
): Promise<boolean> {
  if (cardsLanguageColumnCache != null) {
    if (!cardsLanguageColumnCache) {
      logSchemaDegradedOnce(context, ["cards.language"]);
    }
    return cardsLanguageColumnCache;
  }

  cardsLanguageColumnCache = await hasColumn("cards", "language");
  if (!cardsLanguageColumnCache) {
    logSchemaDegradedOnce(context, ["cards.language"]);
  }
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

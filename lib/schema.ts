import { query } from "./db";

let confidenceColumnCache: boolean | null = null;
let cardLanguageColumnCache: boolean | null = null;
let listingsMarketColumnCache: boolean | null = null;
let historicalMarketColumnCache: boolean | null = null;
let historicalStdDevColumnCache: boolean | null = null;

export async function ensureDealConfidenceColumn(): Promise<boolean> {
  if (confidenceColumnCache != null) {
    return confidenceColumnCache;
  }
  confidenceColumnCache = await hasColumn("listings", "deal_confidence_weight");
  return confidenceColumnCache;
}

export async function ensureCardLanguageColumn(): Promise<boolean> {
  if (cardLanguageColumnCache != null) {
    return cardLanguageColumnCache;
  }
  cardLanguageColumnCache = await hasColumn("cards", "language");
  return cardLanguageColumnCache;
}

export async function ensureListingsMarketColumn(): Promise<boolean> {
  if (listingsMarketColumnCache != null) {
    return listingsMarketColumnCache;
  }
  listingsMarketColumnCache = await hasColumn("listings", "market");
  return listingsMarketColumnCache;
}

export async function ensureHistoricalMarketColumn(): Promise<boolean> {
  if (historicalMarketColumnCache != null) {
    return historicalMarketColumnCache;
  }
  historicalMarketColumnCache = await hasColumn("historical_prices", "market");
  return historicalMarketColumnCache;
}

export async function ensureHistoricalStdDevColumn(): Promise<boolean> {
  if (historicalStdDevColumnCache != null) {
    return historicalStdDevColumnCache;
  }
  historicalStdDevColumnCache = await hasColumn("historical_prices", "std_dev_cad");
  return historicalStdDevColumnCache;
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  try {
    const res = await query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = $1
            AND column_name = $2
        ) AS exists;
      `,
      [table, column],
    );
    return Boolean(res.rows[0]?.exists);
  } catch {
    return false;
  }
}

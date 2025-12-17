import { query } from "./db";

// =============================================================================
// TYPES
// =============================================================================

export type OverrideType = "ALLOW" | "HARD_BLOCK" | "SOFT_EXCLUDE";

export interface ListingOverride {
  listing_id: string;
  override_type: OverrideType;
  reason: string | null;
  created_at: Date;
  created_by: string | null;
  expires_at: Date | null;
}

// =============================================================================
// COLUMN CACHES
// =============================================================================

let confidenceColumnCache: boolean | null = null;
let cardLanguageColumnCache: boolean | null = null;
let listingsMarketColumnCache: boolean | null = null;
let historicalMarketColumnCache: boolean | null = null;
let historicalStdDevColumnCache: boolean | null = null;
let listingsIntegrityColumnsCache: boolean | null = null;

const REQUIRED_LISTINGS_INTEGRITY_COLUMNS = [
  "integrity_status",
  "integrity_reason",
  "integrity_score",
] as const;

export const LISTINGS_INTEGRITY_MISSING_MESSAGE =
  "Missing listings.integrity_* columns. Run migrations/002_add_listing_integrity_fields.sql against DATABASE_URL.";

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

export async function ensureListingsIntegrityColumns(): Promise<boolean> {
  if (listingsIntegrityColumnsCache != null) {
    return listingsIntegrityColumnsCache;
  }
  const checks = await Promise.all(
    REQUIRED_LISTINGS_INTEGRITY_COLUMNS.map((column) =>
      hasColumn("listings", column),
    ),
  );
  listingsIntegrityColumnsCache = checks.every(Boolean);
  if (!listingsIntegrityColumnsCache) {
    console.error(LISTINGS_INTEGRITY_MISSING_MESSAGE);
  }
  return listingsIntegrityColumnsCache;
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

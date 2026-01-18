import { query } from "../../db";

export type FXRate = {
  currency: string;
  rateToUsd: number;
  updatedAt: Date;
};

let fxRateSnapshotsCache: Map<string, FXRate> | null = null;
let fxCacheExpiry: number = 0;
const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Inject FX rate cache for testing. Only use in tests.
 * @internal
 */
export function __setFXCacheForTesting(
  cache: Map<string, FXRate> | null,
  expiry?: number
): void {
  fxRateSnapshotsCache = cache;
  fxCacheExpiry = expiry ?? Date.now() + FX_CACHE_TTL_MS;
}

/**
 * Canonical FX definition: rate_to_usd = "USD per 1 unit of native currency"
 * Formula: native_amount × rate_to_usd = USD_amount
 */
const FX_RATE_MIN = 0.0001;
const FX_RATE_MAX = 10000;

export type FXRateRunStatus = "SUCCESS" | "DRIFT_SUSPECT" | "FAILED";

export const FX_DRIFT_SUSPECT_PERCENT = 5;
export const FX_DRIFT_FAILED_PERCENT = 15;

export function computeFXDriftPercent(
  previousRateToUsd: number,
  nextRateToUsd: number
): number {
  if (
    !Number.isFinite(previousRateToUsd) ||
    previousRateToUsd <= 0 ||
    !Number.isFinite(nextRateToUsd) ||
    nextRateToUsd <= 0
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return (
    (Math.abs(nextRateToUsd - previousRateToUsd) / previousRateToUsd) * 100
  );
}

export function classifyFXDriftStatus(
  maxDriftPercent: number
): FXRateRunStatus {
  if (!Number.isFinite(maxDriftPercent)) {
    return "FAILED";
  }
  if (maxDriftPercent > FX_DRIFT_FAILED_PERCENT) {
    return "FAILED";
  }
  if (maxDriftPercent > FX_DRIFT_SUSPECT_PERCENT) {
    return "DRIFT_SUSPECT";
  }
  return "SUCCESS";
}

/**
 * Validate FX rate hard bounds (Option A Phase 0).
 * Returns error message if invalid, null if valid.
 */
export function validateFXRateDirection(
  currency: string,
  rate: number
): string | null {
  const upper = currency.toUpperCase();

  if (!Number.isFinite(rate) || rate <= 0) {
    return `Invalid rate for ${upper}: ${rate} (must be finite and > 0)`;
  }

  if (rate < FX_RATE_MIN || rate > FX_RATE_MAX) {
    return `Invalid rate for ${upper}: ${rate} (must be within [${FX_RATE_MIN}, ${FX_RATE_MAX}])`;
  }

  return null;
}

/**
 * Get all FX rates from the database (rate + updated_at), with caching.
 * Returns a map of currency code -> FXRate snapshot.
 */
export async function getFXRateSnapshots(): Promise<Map<string, FXRate>> {
  const now = Date.now();

  if (fxRateSnapshotsCache && now < fxCacheExpiry) {
    return fxRateSnapshotsCache;
  }

  const result = await query<{
    currency: string;
    rate_to_usd: string;
    updated_at: Date;
  }>(`SELECT currency, rate_to_usd, updated_at FROM fx_rates;`);

  const snapshots = new Map<string, FXRate>();
  for (const row of result.rows) {
    const upper = row.currency.toUpperCase();
    snapshots.set(upper, {
      currency: upper,
      rateToUsd: parseFloat(row.rate_to_usd),
      updatedAt: new Date(row.updated_at),
    });
  }

  fxRateSnapshotsCache = snapshots;
  fxCacheExpiry = now + FX_CACHE_TTL_MS;

  return snapshots;
}

/**
 * Get all FX rates from the database, with caching.
 * Returns a map of currency code -> rate_to_usd.
 */
export async function getFXRates(): Promise<Map<string, number>> {
  const snapshots = await getFXRateSnapshots();
  const rates = new Map<string, number>();

  for (const [currency, snapshot] of snapshots.entries()) {
    rates.set(currency, snapshot.rateToUsd);
  }

  return rates;
}

export async function getFXRateSnapshot(
  currency: string
): Promise<FXRate | null> {
  const snapshots = await getFXRateSnapshots();
  return snapshots.get(currency.toUpperCase()) ?? null;
}

/**
 * Get a single FX rate for a currency.
 * Returns null if not found (caller should skip ingestion for that market).
 */
export async function getFXRate(currency: string): Promise<number | null> {
  const snapshot = await getFXRateSnapshot(currency);
  return snapshot?.rateToUsd ?? null;
}

/**
 * Convert native currency amount to USD using stored FX rates.
 * Returns null if rate not found or amount is invalid.
 */
export async function convertToUSD(
  amount: number | null | undefined,
  currency: string
): Promise<{ usd: number; rate: number; fxTimestamp: Date } | null> {
  if (amount == null || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  const snapshot = await getFXRateSnapshot(currency);
  if (snapshot == null) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[FX_RATE_MISSING] currency=${currency.toUpperCase()} in convertToUSD`
      );
    }
    return null;
  }

  const usd = amount * snapshot.rateToUsd;

  // Align with DB storage scale (NUMERIC(18, 6)). Rounding for display remains a UI concern.
  const usdRounded = Math.round(usd * 1_000_000) / 1_000_000;

  return {
    usd: usdRounded,
    rate: snapshot.rateToUsd,
    fxTimestamp: snapshot.updatedAt,
  };
}

/**
 * Invalidate the FX rates cache (call after manual updates).
 */
export function invalidateFXCache(): void {
  fxRateSnapshotsCache = null;
  fxCacheExpiry = 0;
}

/**
 * Update a single FX rate in the database.
 * Validates hard bounds unless skipValidation is true.
 */
export async function updateFXRate(
  currency: string,
  rateToUsd: number,
  notes?: string,
  options?: { skipValidation?: boolean }
): Promise<void> {
  if (!options?.skipValidation) {
    const error = validateFXRateDirection(currency, rateToUsd);
    if (error) {
      throw new Error(`FX rate validation failed: ${error}`);
    }
  }

  await query(
    `
    INSERT INTO fx_rates (currency, rate_to_usd, updated_at, notes)
    VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
    ON CONFLICT (currency)
    DO UPDATE SET
      rate_to_usd = EXCLUDED.rate_to_usd,
      updated_at = CURRENT_TIMESTAMP,
      notes = COALESCE(EXCLUDED.notes, fx_rates.notes);
    `,
    [currency.toUpperCase(), rateToUsd, notes ?? null]
  );

  invalidateFXCache();
}

/**
 * Bulk upsert FX rates in a single statement (atomic).
 * Ensures no partial writes across currencies.
 */
export async function upsertFXRates(
  rates: Map<string, number>,
  notes?: string,
  options?: { skipValidation?: boolean }
): Promise<void> {
  const entries: Array<[string, number]> = Array.from(rates.entries()).map(
    ([currency, rateToUsd]): [string, number] => [
      currency.toUpperCase(),
      rateToUsd,
    ]
  );

  if (entries.length === 0) {
    return;
  }

  if (!options?.skipValidation) {
    const errors: string[] = [];
    for (const [currency, rateToUsd] of entries) {
      const error = validateFXRateDirection(currency, rateToUsd);
      if (error) errors.push(error);
    }
    if (errors.length > 0) {
      throw new Error(`FX rate validation failed:\n- ${errors.join("\n- ")}`);
    }
  }

  entries.sort(([a], [b]) => a.localeCompare(b));

  const values: Array<string | number | null> = [];
  const rowsSql: string[] = [];
  let paramIndex = 1;
  for (const [currency, rateToUsd] of entries) {
    rowsSql.push(
      `($${paramIndex++}, $${paramIndex++}, CURRENT_TIMESTAMP, $${paramIndex++})`
    );
    values.push(currency, rateToUsd, notes ?? null);
  }

  await query(
    `
      INSERT INTO fx_rates (currency, rate_to_usd, updated_at, notes)
      VALUES ${rowsSql.join(",\n")}
      ON CONFLICT (currency)
      DO UPDATE SET
        rate_to_usd = EXCLUDED.rate_to_usd,
        updated_at = CURRENT_TIMESTAMP,
        notes = COALESCE(EXCLUDED.notes, fx_rates.notes);
    `,
    values
  );

  invalidateFXCache();
}

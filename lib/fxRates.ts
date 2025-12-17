import { query } from "./db";

export type FXRate = {
  currency: string;
  rateToUsd: number;
  updatedAt: Date;
};

let fxRatesCache: Map<string, number> | null = null;
let fxCacheExpiry: number = 0;
const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get all FX rates from the database, with caching.
 * Returns a map of currency code -> rate_to_usd.
 */
export async function getFXRates(): Promise<Map<string, number>> {
  const now = Date.now();
  
  if (fxRatesCache && now < fxCacheExpiry) {
    return fxRatesCache;
  }
  
  const result = await query<{ currency: string; rate_to_usd: string }>(
    `SELECT currency, rate_to_usd FROM fx_rates;`
  );
  
  const rates = new Map<string, number>();
  for (const row of result.rows) {
    rates.set(row.currency.toUpperCase(), parseFloat(row.rate_to_usd));
  }
  
  fxRatesCache = rates;
  fxCacheExpiry = now + FX_CACHE_TTL_MS;
  
  return rates;
}

/**
 * Get a single FX rate for a currency.
 * Returns null if not found (caller should skip ingestion for that market).
 */
export async function getFXRate(currency: string): Promise<number | null> {
  const rates = await getFXRates();
  return rates.get(currency.toUpperCase()) ?? null;
}

/**
 * Convert native currency amount to USD using stored FX rates.
 * Returns null if rate not found or amount is invalid.
 */
export async function convertToUSD(
  amount: number | null | undefined,
  currency: string
): Promise<{ usd: number; rate: number } | null> {
  if (amount == null || !Number.isFinite(amount) || amount < 0) {
    return null;
  }
  
  const rate = await getFXRate(currency);
  if (rate == null) {
    return null;
  }
  
  const usd = amount * rate;
  return { usd: Number(usd.toFixed(2)), rate };
}

/**
 * Invalidate the FX rates cache (call after manual updates).
 */
export function invalidateFXCache(): void {
  fxRatesCache = null;
  fxCacheExpiry = 0;
}

/**
 * Update a single FX rate in the database.
 */
export async function updateFXRate(
  currency: string,
  rateToUsd: number,
  notes?: string
): Promise<void> {
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

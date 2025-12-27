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
 * Expected rate direction bounds for sanity checks.
 * These prevent inverted rates from being stored (e.g., USD→GBP instead of GBP→USD).
 *
 * Direction rule:
 * - Currencies stronger than USD (GBP, EUR) have rate_to_usd > 1.0
 * - Currencies weaker than USD (CAD, AUD, MXN) have rate_to_usd < 1.0
 */
export const FX_RATE_BOUNDS: Record<string, { min: number; max: number }> = {
  USD: { min: 1.0, max: 1.0 },
  GBP: { min: 1.15, max: 1.6 }, // GBP is stronger than USD
  EUR: { min: 1.0, max: 1.25 }, // EUR roughly at parity or stronger
  CAD: { min: 0.65, max: 0.85 }, // CAD is weaker than USD
  AUD: { min: 0.55, max: 0.8 }, // AUD is weaker than USD
  MXN: { min: 0.04, max: 0.08 }, // MXN is much weaker than USD
};

/**
 * Validate that an FX rate is within expected bounds for the currency.
 * Returns an error message if invalid, null if valid.
 */
export function validateFXRate(currency: string, rate: number): string | null {
  const upperCurrency = currency.toUpperCase();

  if (!Number.isFinite(rate) || rate <= 0) {
    return `Invalid rate: ${rate} (must be positive number)`;
  }

  const bounds = FX_RATE_BOUNDS[upperCurrency];
  if (!bounds) {
    // Unknown currency - allow but warn
    return null;
  }

  if (rate < bounds.min || rate > bounds.max) {
    return (
      `Rate ${rate} for ${upperCurrency} is outside expected bounds ` +
      `[${bounds.min}, ${bounds.max}]. ` +
      `This may indicate an inverted rate (e.g., USD→${upperCurrency} instead of ${upperCurrency}→USD).`
    );
  }

  return null;
}

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
 * Validates rate is within expected bounds to prevent inverted rates.
 * Set skipValidation=true to bypass bounds check (use with caution).
 */
export async function updateFXRate(
  currency: string,
  rateToUsd: number,
  notes?: string,
  options?: { skipValidation?: boolean }
): Promise<void> {
  // Validate rate direction unless explicitly skipped
  if (!options?.skipValidation) {
    const validationError = validateFXRate(currency, rateToUsd);
    if (validationError) {
      throw new Error(`FX rate validation failed: ${validationError}`);
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

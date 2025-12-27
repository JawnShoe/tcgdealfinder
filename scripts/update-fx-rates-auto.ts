#!/usr/bin/env tsx
/**
 * Automated FX rate updater.
 *
 * Fetches exchange rates from Frankfurter API (free, no API key),
 * validates direction, and writes to database.
 *
 * Hard safety requirements:
 * - Dry-run mode available (default)
 * - No secrets printed
 * - Idempotent (running twice is safe)
 * - If validation fails, no partial writes
 *
 * Usage:
 *   npx tsx scripts/update-fx-rates-auto.ts           # Dry run
 *   npx tsx scripts/update-fx-rates-auto.ts --apply   # Apply changes
 */

import { query } from "../lib/db";
import {
  getFXRates,
  updateFXRate,
  validateFXRateDirection,
  invalidateFXCache,
} from "../lib/fxRates";

// Frankfurter API - free, no API key required
// https://frankfurter.dev/
const FRANKFURTER_API = "https://api.frankfurter.dev/v1/latest";

// Currencies we need to update (base is USD)
const TARGET_CURRENCIES = ["CAD", "GBP", "AUD", "EUR"];

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch rates from Frankfurter API.
 * Returns rates as "currency -> rate_to_usd" (1 unit of currency = X USD).
 */
async function fetchRatesFromAPI(): Promise<Map<string, number>> {
  const symbols = TARGET_CURRENCIES.join(",");
  const url = `${FRANKFURTER_API}?base=USD&symbols=${symbols}`;

  console.log(`Fetching rates from: ${url.replace(/\?.*/, "?...")}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  const data: FrankfurterResponse = await response.json();
  console.log(`API response date: ${data.date}`);

  // Convert from USD base (1 USD = X currency) to rate_to_usd (1 currency = X USD)
  const rates = new Map<string, number>();

  for (const [currency, usdToCurrency] of Object.entries(data.rates)) {
    if (usdToCurrency <= 0) {
      throw new Error(`Invalid rate for ${currency}: ${usdToCurrency}`);
    }
    // If 1 USD = 0.74 CAD, then 1 CAD = 1/0.74 USD = 1.35 USD
    // Wait, that's backwards. Frankfurter with base=USD gives: 1 USD = X CAD
    // So 1 CAD = 1/X USD
    // rate_to_usd = 1 / usdToCurrency
    const rateToUsd = 1 / usdToCurrency;
    rates.set(currency.toUpperCase(), rateToUsd);
  }

  // Add USD = 1.0
  rates.set("USD", 1.0);

  return rates;
}

/**
 * Validate all rates before writing.
 * Returns list of validation errors (empty if all valid).
 */
function validateAllRates(rates: Map<string, number>): string[] {
  const errors: string[] = [];

  for (const [currency, rate] of rates) {
    const error = validateFXRateDirection(currency, rate);
    if (error) {
      errors.push(`${currency}: ${error}`);
    }
  }

  return errors;
}

async function main() {
  const applyMode = process.argv.includes("--apply");
  const dryRun = !applyMode;

  console.log(
    "╔══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║           AUTOMATED FX RATE UPDATER                          ║"
  );
  console.log(
    `║           Mode: ${dryRun ? "DRY RUN (no changes)" : "APPLY (will update DB)"}                      ║`
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n"
  );

  // Step 1: Fetch current DB rates
  console.log("1. Current rates in database:");
  const currentRates = await getFXRates();
  for (const [currency, rate] of currentRates) {
    console.log(`   ${currency}: ${rate.toFixed(6)}`);
  }
  console.log();

  // Step 2: Fetch new rates from API
  console.log("2. Fetching new rates from Frankfurter API...");
  const newRates = await fetchRatesFromAPI();
  console.log("   New rates (rate_to_usd):");
  for (const [currency, rate] of newRates) {
    console.log(`   ${currency}: ${rate.toFixed(6)}`);
  }
  console.log();

  // Step 3: Validate all rates
  console.log("3. Validating rates...");
  const errors = validateAllRates(newRates);

  if (errors.length > 0) {
    console.log("\n❌ VALIDATION FAILED - Aborting update:");
    for (const error of errors) {
      console.log(`   • ${error}`);
    }
    console.log("\nNo changes made to database.");
    process.exit(1);
  }

  console.log("   ✓ All rates pass direction validation\n");

  // Step 4: Show comparison
  console.log("4. Rate comparison (current → new):");
  for (const currency of TARGET_CURRENCIES) {
    const current = currentRates.get(currency);
    const newRate = newRates.get(currency);
    const currentStr = current != null ? current.toFixed(6) : "(not set)";
    const newStr = newRate != null ? newRate.toFixed(6) : "(not set)";
    const changed =
      current == null || newRate == null
        ? "NEW"
        : Math.abs(current - newRate) > 0.0001
          ? "CHANGED"
          : "same";
    console.log(`   ${currency}: ${currentStr} → ${newStr} [${changed}]`);
  }
  console.log();

  // Step 5: Apply or show dry-run notice
  if (dryRun) {
    console.log("5. DRY RUN - No changes made to database.");
    console.log("   Run with --apply to update rates.\n");
    return;
  }

  console.log("5. Applying updates...");
  for (const [currency, rate] of newRates) {
    if (currency === "USD") continue; // Skip USD
    const notes = `Auto-updated from Frankfurter API`;
    await updateFXRate(currency, rate, notes);
    console.log(`   ✓ Updated ${currency} to ${rate.toFixed(6)}`);
  }

  // Clear cache
  invalidateFXCache();
  console.log("\n✓ FX rate cache invalidated");

  // Step 6: Verify update
  console.log("\n6. Verification - rates now in database:");
  const verifyRates = await getFXRates();
  for (const [currency, rate] of verifyRates) {
    console.log(`   ${currency}: ${rate.toFixed(6)}`);
  }

  console.log("\n✅ FX rates updated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ ERROR:", err.message || err);
    // Don't print stack trace (may contain secrets)
    process.exit(1);
  });

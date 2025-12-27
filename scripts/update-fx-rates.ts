#!/usr/bin/env tsx
/**
 * Update FX rates manually.
 *
 * Usage:
 *   npx tsx scripts/update-fx-rates.ts
 *   npx tsx scripts/update-fx-rates.ts --currency CAD --rate 0.72
 *   npx tsx scripts/update-fx-rates.ts --currency GBP --rate 1.35 --notes 'Updated from XE.com'
 *   npx tsx scripts/update-fx-rates.ts --validate  # Validate current rates
 */

import {
  updateFXRate,
  getFXRates,
  validateFXRate,
  FX_RATE_BOUNDS,
} from "../lib/fxRates";

async function showRatesWithValidation(): Promise<void> {
  console.log("Current FX rates (to USD):\n");
  console.log("  Rate semantics: native_amount × rate = USD_amount");
  console.log("  - Currencies STRONGER than USD (GBP): rate > 1.0");
  console.log("  - Currencies WEAKER than USD (CAD, AUD): rate < 1.0\n");

  const rates = await getFXRates();
  let hasIssues = false;

  for (const [currency, rate] of rates.entries()) {
    const validationError = validateFXRate(currency, rate);
    const bounds = FX_RATE_BOUNDS[currency];
    const boundsStr = bounds ? `[${bounds.min}, ${bounds.max}]` : "[unknown]";

    if (validationError) {
      console.log(
        `  ❌ ${currency}: ${rate.toFixed(6)} - INVALID ${boundsStr}`
      );
      console.log(`     ${validationError}`);
      hasIssues = true;
    } else {
      console.log(`  ✅ ${currency}: ${rate.toFixed(6)} ${boundsStr}`);
    }
  }

  if (hasIssues) {
    console.log("\n⚠️  Some rates appear to be inverted. Fix with:");
    console.log(
      "  npx tsx scripts/update-fx-rates.ts --currency GBP --rate 1.35"
    );
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--validate")) {
    await showRatesWithValidation();
    console.log("\nUsage:");
    console.log(
      "  npx tsx scripts/update-fx-rates.ts --currency CAD --rate 0.72"
    );
    console.log(
      "  npx tsx scripts/update-fx-rates.ts --currency GBP --rate 1.35 --notes 'Updated from XE.com'"
    );
    console.log(
      "  npx tsx scripts/update-fx-rates.ts --validate  # Check for inverted rates"
    );
    return;
  }

  const currencyIndex = args.indexOf("--currency");
  const rateIndex = args.indexOf("--rate");
  const notesIndex = args.indexOf("--notes");
  const forceIndex = args.indexOf("--force");

  if (currencyIndex === -1 || rateIndex === -1) {
    console.error("Error: Both --currency and --rate are required");
    process.exit(1);
  }

  const currency = args[currencyIndex + 1];
  const rateStr = args[rateIndex + 1];
  const notes = notesIndex !== -1 ? args[notesIndex + 1] : undefined;
  const force = forceIndex !== -1;

  if (!currency || !rateStr) {
    console.error("Error: Invalid arguments");
    process.exit(1);
  }

  const rate = parseFloat(rateStr);
  if (!Number.isFinite(rate) || rate <= 0) {
    console.error(`Error: Invalid rate: ${rateStr}`);
    process.exit(1);
  }

  // Validate before update
  const validationError = validateFXRate(currency, rate);
  if (validationError) {
    console.error(`\n❌ Rate validation failed:`);
    console.error(`   ${validationError}\n`);

    if (!force) {
      console.error(
        "If you're sure this rate is correct, use --force to bypass validation."
      );
      process.exit(1);
    }
    console.log("⚠️  --force flag used, bypassing validation...\n");
  }

  console.log(`Updating ${currency} -> USD rate to ${rate.toFixed(6)}`);
  if (notes) {
    console.log(`Notes: ${notes}`);
  }

  await updateFXRate(currency, rate, notes, { skipValidation: force });
  console.log("✅ FX rate updated successfully");

  // Show updated rates with validation
  console.log("\nUpdated rates:");
  await showRatesWithValidation();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

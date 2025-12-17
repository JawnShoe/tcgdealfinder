#!/usr/bin/env tsx
/**
 * Update FX rates manually.
 * 
 * Usage:
 *   npx tsx scripts/update-fx-rates.ts
 *   npx tsx scripts/update-fx-rates.ts --currency CAD --rate 0.72
 */

import { updateFXRate, getFXRates } from "../lib/fxRates";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Show current rates
    console.log("Current FX rates (to USD):\n");
    const rates = await getFXRates();
    for (const [currency, rate] of rates.entries()) {
      console.log(`  ${currency}: ${rate.toFixed(6)}`);
    }
    console.log("\nUsage:");
    console.log("  npx tsx scripts/update-fx-rates.ts --currency CAD --rate 0.72");
    console.log("  npx tsx scripts/update-fx-rates.ts --currency GBP --rate 1.27 --notes 'Updated from XE.com'");
    return;
  }
  
  const currencyIndex = args.indexOf("--currency");
  const rateIndex = args.indexOf("--rate");
  const notesIndex = args.indexOf("--notes");
  
  if (currencyIndex === -1 || rateIndex === -1) {
    console.error("Error: Both --currency and --rate are required");
    process.exit(1);
  }
  
  const currency = args[currencyIndex + 1];
  const rateStr = args[rateIndex + 1];
  const notes = notesIndex !== -1 ? args[notesIndex + 1] : undefined;
  
  if (!currency || !rateStr) {
    console.error("Error: Invalid arguments");
    process.exit(1);
  }
  
  const rate = parseFloat(rateStr);
  if (!Number.isFinite(rate) || rate <= 0) {
    console.error(`Error: Invalid rate: ${rateStr}`);
    process.exit(1);
  }
  
  console.log(`Updating ${currency} -> USD rate to ${rate.toFixed(6)}`);
  if (notes) {
    console.log(`Notes: ${notes}`);
  }
  
  await updateFXRate(currency, rate, notes);
  console.log("✅ FX rate updated successfully");
  
  // Show updated rates
  console.log("\nUpdated rates:");
  const rates = await getFXRates();
  for (const [curr, r] of rates.entries()) {
    const marker = curr.toUpperCase() === currency.toUpperCase() ? " ←" : "";
    console.log(`  ${curr}: ${r.toFixed(6)}${marker}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

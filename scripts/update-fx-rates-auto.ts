#!/usr/bin/env tsx
/**
 * Automated FX rate updater (Option A Phase 0).
 *
 * Provider: Open Exchange Rates (requires OPEN_EXCHANGE_RATES_APP_ID)
 * Cadence: hourly (one provider call/hour) and cache full rates table in DB.
 *
 * Safety invariants:
 * - Dry-run is default; use --apply to write.
 * - Hard validation: rate is finite, > 0, and within [0.0001, 10000].
 * - Drift check vs previous successful snapshot (fx_rates):
 *   - If any currency drifts by > 15%: FAILED (hold last-known, alert)
 *   - Else if any currency drifts by > 5%: DRIFT_SUSPECT (hold last-known, alert)
 * - No partial writes: fx_rates updated via a single bulk upsert statement.
 * - Every applied attempt is recorded in fx_rate_runs.
 *
 * Usage:
 *   npx tsx scripts/update-fx-rates-auto.ts
 *   npx tsx scripts/update-fx-rates-auto.ts --apply
 */

import { query } from "../lib/db";
import {
  FXRateRunStatus,
  classifyFXDriftStatus,
  computeFXDriftPercent,
  getFXRates,
  upsertFXRates,
  validateFXRateDirection,
} from "../lib/fxRates";

const PROVIDER = "OPEN_EXCHANGE_RATES";
const CADENCE = "hourly";

const OXR_URL = "https://openexchangerates.org/api/latest.json";
const OXR_APP_ID_ENV = "OPEN_EXCHANGE_RATES_APP_ID";

type OpenExchangeRatesResponse = {
  disclaimer?: string;
  license?: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
};

type DriftDetail = {
  currency: string;
  previous_rate_to_usd: number;
  next_rate_to_usd: number;
  drift_percent: number;
};

function sanitizeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function buildExitCodeForStatus(status: FXRateRunStatus): number {
  if (status === "SUCCESS") return 0;
  if (status === "DRIFT_SUSPECT") return 2;
  return 1;
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("app_id")) {
      u.searchParams.set("app_id", "REDACTED");
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function ensureFxRateRunsTableExists(): Promise<void> {
  const res = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'fx_rate_runs'
      ) AS exists;
    `
  );
  if (!res.rows[0]?.exists) {
    throw new Error(
      "Missing fx_rate_runs table. Run migrations/009_option_a_fx_rate_runs.sql."
    );
  }
}

async function fetchOpenExchangeRates(): Promise<{
  providerTimestamp: number;
  ratesToUsd: Map<string, number>;
  rawPayloadJson: string;
}> {
  const appId = process.env[OXR_APP_ID_ENV];
  if (!appId) {
    throw new Error(`${OXR_APP_ID_ENV} is not set`);
  }

  const url = `${OXR_URL}?app_id=${encodeURIComponent(appId)}`;
  console.log(`Fetching rates from: ${redactUrl(url)}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Provider request failed: ${response.status} ${response.statusText}`
    );
  }

  const data: OpenExchangeRatesResponse = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("Provider response was not valid JSON");
  }

  if (data.base !== "USD") {
    throw new Error(`Unexpected provider base currency: ${data.base}`);
  }

  const ratesToUsd = new Map<string, number>();
  for (const [currency, usdToCurrency] of Object.entries(data.rates)) {
    const upper = currency.toUpperCase();
    if (upper.length !== 3) continue;
    if (!Number.isFinite(usdToCurrency) || usdToCurrency <= 0) {
      throw new Error(`Invalid provider rate for ${upper}: ${usdToCurrency}`);
    }

    // Provider returns: 1 USD = X currency units
    // Canonical storage requires: 1 currency unit = X USD
    ratesToUsd.set(upper, 1 / usdToCurrency);
  }

  // Ensure USD is present canonically
  ratesToUsd.set("USD", 1.0);

  return {
    providerTimestamp: data.timestamp,
    ratesToUsd,
    rawPayloadJson: JSON.stringify(data),
  };
}

function validateAllRates(ratesToUsd: Map<string, number>): string[] {
  const errors: string[] = [];
  for (const [currency, rateToUsd] of ratesToUsd) {
    const error = validateFXRateDirection(currency, rateToUsd);
    if (error) errors.push(error);
  }
  return errors;
}

function computeDriftDetails(
  previousRates: Map<string, number>,
  nextRates: Map<string, number>
): { maxDriftPercent: number; topDrifts: DriftDetail[] } {
  const drifts: DriftDetail[] = [];

  for (const [currency, previousRateToUsd] of previousRates) {
    const nextRateToUsd = nextRates.get(currency);
    if (nextRateToUsd == null) continue;
    const driftPercent = computeFXDriftPercent(
      previousRateToUsd,
      nextRateToUsd
    );
    if (!Number.isFinite(driftPercent)) continue;

    drifts.push({
      currency,
      previous_rate_to_usd: previousRateToUsd,
      next_rate_to_usd: nextRateToUsd,
      drift_percent: driftPercent,
    });
  }

  drifts.sort((a, b) => b.drift_percent - a.drift_percent);

  return {
    maxDriftPercent: drifts.length > 0 ? drifts[0]!.drift_percent : 0,
    topDrifts: drifts.slice(0, 20),
  };
}

async function insertFxRateRun(args: {
  startedAt: Date;
  completedAt: Date;
  status: FXRateRunStatus;
  maxDriftPercent: number;
  driftDetailsJson: string | null;
  failureReason: string | null;
  rawPayloadJson: string | null;
}): Promise<number | null> {
  try {
    const res = await query<{ id: number }>(
      `
        INSERT INTO fx_rate_runs (
          provider,
          cadence,
          started_at,
          completed_at,
          status,
          max_drift_percent,
          drift_details_json,
          failure_reason,
          raw_payload_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb)
        RETURNING id;
      `,
      [
        PROVIDER,
        CADENCE,
        args.startedAt,
        args.completedAt,
        args.status,
        args.maxDriftPercent,
        args.driftDetailsJson,
        args.failureReason,
        args.rawPayloadJson,
      ]
    );
    return res.rows[0]?.id ?? null;
  } catch (err) {
    console.error(
      "WARN: failed to write fx_rate_runs row:",
      sanitizeErrorMessage(err)
    );
    return null;
  }
}

async function main(): Promise<number> {
  const applyMode = process.argv.includes("--apply");

  console.log("=== Automated FX Rate Updater (Option A Phase 0) ===");
  console.log(`Mode: ${applyMode ? "APPLY" : "DRY RUN"}`);
  console.log(`Provider: ${PROVIDER} | Cadence: ${CADENCE}\n`);

  const startedAt = new Date();

  let currentRates: Map<string, number>;
  try {
    currentRates = await getFXRates();
  } catch (err) {
    console.error("ERROR: failed to read current fx_rates snapshot");
    console.error(sanitizeErrorMessage(err));
    return 1;
  }

  let providerTimestamp: number | null = null;
  let nextRates: Map<string, number> | null = null;
  let rawPayloadJson: string | null = null;

  let status: FXRateRunStatus = "FAILED";
  let maxDriftPercent = 0;
  let driftDetailsJson: string | null = null;
  let failureReason: string | null = null;

  try {
    const fetched = await fetchOpenExchangeRates();
    providerTimestamp = fetched.providerTimestamp;
    nextRates = fetched.ratesToUsd;
    rawPayloadJson = fetched.rawPayloadJson;

    console.log(
      `Provider timestamp: ${new Date(providerTimestamp * 1000).toISOString()}`
    );
    console.log(`Provider currencies: ${nextRates.size}`);

    const validationErrors = validateAllRates(nextRates);
    if (validationErrors.length > 0) {
      status = "FAILED";
      maxDriftPercent = 0;
      driftDetailsJson = JSON.stringify({
        hard_validation_errors: validationErrors.slice(0, 50),
      });
      failureReason = `Hard validation failed (${validationErrors.length} errors)`;
    } else {
      const drift = computeDriftDetails(currentRates, nextRates);
      maxDriftPercent = drift.maxDriftPercent;
      driftDetailsJson = JSON.stringify({
        provider_timestamp: providerTimestamp,
        sample_top_drifts: drift.topDrifts,
      });
      status = classifyFXDriftStatus(maxDriftPercent);
      if (status !== "SUCCESS") {
        failureReason = `Drift exceeded threshold (max=${maxDriftPercent.toFixed(4)}%)`;
      }
    }
  } catch (err) {
    status = "FAILED";
    failureReason = sanitizeErrorMessage(err);
  }

  const completedAt = new Date();

  console.log("\n--- Decision ---");
  console.log(`Status: ${status}`);
  console.log(`Max drift percent: ${maxDriftPercent.toFixed(4)}%`);
  if (failureReason) {
    console.log(`Reason: ${failureReason}`);
  }

  if (!applyMode) {
    console.log(
      "\nDRY RUN: no DB writes (fx_rates and fx_rate_runs unchanged)."
    );
    return buildExitCodeForStatus(status);
  }

  await ensureFxRateRunsTableExists();

  if (status !== "SUCCESS") {
    await insertFxRateRun({
      startedAt,
      completedAt,
      status,
      maxDriftPercent,
      driftDetailsJson,
      failureReason,
      rawPayloadJson,
    });
    console.error(
      "\nHOLD LAST-KNOWN: fx_rates not mutated due to non-success status."
    );
    return buildExitCodeForStatus(status);
  }

  if (!nextRates || rawPayloadJson == null || providerTimestamp == null) {
    await insertFxRateRun({
      startedAt,
      completedAt,
      status: "FAILED",
      maxDriftPercent: 0,
      driftDetailsJson: null,
      failureReason: "Internal error: missing fetched provider payload",
      rawPayloadJson: null,
    });
    return 1;
  }

  try {
    await upsertFXRates(nextRates, `Auto-updated from ${PROVIDER}`);
  } catch (err) {
    await insertFxRateRun({
      startedAt,
      completedAt,
      status: "FAILED",
      maxDriftPercent,
      driftDetailsJson,
      failureReason: `DB write failed: ${sanitizeErrorMessage(err)}`,
      rawPayloadJson,
    });
    console.error("\nERROR: failed to update fx_rates");
    console.error(sanitizeErrorMessage(err));
    return 1;
  }

  await insertFxRateRun({
    startedAt,
    completedAt,
    status: "SUCCESS",
    maxDriftPercent,
    driftDetailsJson,
    failureReason: null,
    rawPayloadJson,
  });

  console.log(
    "\nSUCCESS: fx_rates updated (atomic upsert) and fx_rate_runs recorded."
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("ERROR:", sanitizeErrorMessage(err));
    process.exit(1);
  });

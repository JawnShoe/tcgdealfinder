# Module 03: Pricing + FX Correctness Review

**Created**: 2025-12-29
**Status**: COMPLETE (Review)
**PR**: TBD

---

## 1) Scope Definition

### What "Pricing Correctness" Means

In this application, pricing correctness encompasses:

- **List Price**: The item price from the eBay listing (stored in native currency)
- **Shipping Price**: Shipping cost from the listing (stored in native currency; may be null/unknown)
- **Total Price**: `price + shipping` (computed at ingest; stored in native currency and USD)
- **Tax Handling**: Not tracked; eBay prices are pre-tax and tax is applied at checkout by eBay

Price fields flow through the system as:

1. **Native currency** (`price_native`, `shipping_native`, `total_native`) - source truth from eBay
2. **USD equivalent** (`total_usd`) - converted at ingest time using DB FX rates
3. **Legacy CAD fields** (`price_cad`, `shipping_cad`, `total_price_cad`) - confusingly named; actually store native currency values (historical naming)

### What "FX Correctness" Means

FX correctness encompasses:

- **Base Currency**: USD is the canonical reference currency for cross-market comparisons
- **Conversion Source**: Open Exchange Rates API (hourly updates via automated script)
- **Rounding Rules**: USD amounts rounded to 6 decimal places (matching DB NUMERIC(18,6) scale)
- **Market Selection**: Each market has a fixed currency (US=USD, CA=CAD, GB=GBP, AU=AUD)

Canonical FX definition: `rate_to_usd` = "USD per 1 unit of native currency"
Conversion formula: `native_amount × rate_to_usd = USD_amount`

---

## 2) Path Map

### FX Source + Storage

| File                              | Function(s)                          | Purpose                                                 |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| `scripts/update-fx-rates-auto.ts` | `main()`, `fetchOpenExchangeRates()` | Automated hourly FX updates from Open Exchange Rates    |
| `scripts/update-fx-rates.ts`      | `main()`                             | Manual FX rate updates (CLI)                            |
| `lib/fxRates.ts`                  | `updateFXRate()`, `upsertFXRates()`  | DB write operations with validation                     |
| DB `fx_rates` table               | -                                    | Stores `currency`, `rate_to_usd`, `updated_at`, `notes` |
| DB `fx_rate_runs` table           | -                                    | Audit log of automated update attempts                  |

### FX Retrieval + Caching

| File                     | Function(s)                             | Purpose                                     |
| ------------------------ | --------------------------------------- | ------------------------------------------- |
| `lib/fxRates.ts:82-109`  | `getFXRateSnapshots()`                  | Main cache-backed DB query for all FX rates |
| `lib/fxRates.ts:115-124` | `getFXRates()`                          | Returns Map of currency → rate_to_usd       |
| `lib/fxRates.ts:137-140` | `getFXRate(currency)`                   | Single currency lookup                      |
| `lib/fxRates.ts:9-11`    | `fxRateSnapshotsCache`, `fxCacheExpiry` | In-memory cache (TTL: 1 hour)               |
| `lib/fxRates.ts:174-177` | `invalidateFXCache()`                   | Cache invalidation after writes             |

**Cache behavior**:

- TTL: 60 minutes (`FX_CACHE_TTL_MS = 60 * 60 * 1000`)
- Fallback: Returns null if currency not in DB (caller must handle)
- Stale behavior: Cache may be up to 1 hour behind DB; no staleness warning

### FX Validation

| File                   | Function(s)                 | Purpose                             |
| ---------------------- | --------------------------- | ----------------------------------- |
| `lib/fxRates.ts:61-76` | `validateFXRateDirection()` | Hard bounds check [0.0001, 10000]   |
| `lib/fxRates.ts:25-40` | `computeFXDriftPercent()`   | Computes % drift from previous rate |
| `lib/fxRates.ts:42-55` | `classifyFXDriftStatus()`   | >5% = SUSPECT, >15% = FAILED        |

### Pricing Computation (Ingest)

| File                                 | Function(s)                   | Purpose                                        |
| ------------------------------------ | ----------------------------- | ---------------------------------------------- |
| `scripts/update-listings.ts:273-291` | Price computation block       | Computes `totalNative`, calls `convertToUSD()` |
| `lib/fxRates.ts:146-169`             | `convertToUSD()`              | Converts native → USD with rounding            |
| `lib/pricing.ts:1-22`                | `computeDiscountPercent()`    | Discount = (total - historic) / historic × 100 |
| `lib/pricing.ts:34-56`               | `getDisplayDiscountPercent()` | Applies ±150% clamp for untrusted sellers      |

### Pricing Computation (Display)

| File                            | Function(s)               | Purpose                                                  |
| ------------------------------- | ------------------------- | -------------------------------------------------------- |
| `lib/money.ts:12-23`            | `convertCad()`            | **HARDCODED FX** - converts using `FX_CAD_TO_USD = 0.74` |
| `lib/money.ts:25-42`            | `formatMoneyFromCad()`    | Formats for display using hardcoded rate                 |
| `lib/dealFormatting.ts:19-32`   | `formatUSD()`             | Formats USD amounts (no conversion)                      |
| `lib/dealFormatting.ts:54-74`   | `formatNativeCurrency()`  | Formats native currency amounts (no conversion)          |
| `lib/dealFormatting.ts:132-165` | `formatPriceWithApprox()` | Native primary + ≈USD secondary display                  |

### Display Surfaces (API)

| File                                  | Function(s)                    | Purpose                            |
| ------------------------------------- | ------------------------------ | ---------------------------------- |
| `app/api/deals/dealsQuery.ts:462-579` | `mapRowToDeal()`               | Transforms DB row to API response  |
| `app/api/deals/dealsQuery.ts:34`      | Import `clampNonNegative`      | Negative price guard (PR #125)     |
| `app/api/deals/dealsQuery.ts:489-495` | `historicPriceUsd` computation | Uses `convertCad()` (hardcoded FX) |

### Display Surfaces (UI)

| File                               | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `components/DealsTable.tsx`        | Main deals table (uses `formatPriceWithApprox`) |
| `components/CardDetailClient.tsx`  | Card detail page listings                       |
| `components/PriceHistoryChart.tsx` | Historical price chart                          |
| `app/top-deals/page.tsx`           | Top deals page                                  |
| `app/ending-soon/page.tsx`         | Ending soon page                                |

---

## 3) Locked Invariants (Candidates)

### FX Rate Storage

| Invariant                                           | Location                          | Status |
| --------------------------------------------------- | --------------------------------- | ------ |
| FX rates stored as `rate_to_usd` (USD per 1 native) | `lib/fxRates.ts:14-15`, DB schema | LOCKED |
| Conversion formula: `native × rate_to_usd = USD`    | `lib/fxRates.ts:159`              | LOCKED |
| FX rate hard bounds: `[0.0001, 10000]`              | `lib/fxRates.ts:17-18`            | LOCKED |
| USD rounding to 6 decimal places                    | `lib/fxRates.ts:162`              | LOCKED |

### FX Update Safety

| Invariant                                     | Location                                  | Status |
| --------------------------------------------- | ----------------------------------------- | ------ |
| Drift >5% = SUSPECT (hold, alert)             | `lib/fxRates.ts:22`                       | LOCKED |
| Drift >15% = FAILED (hold, alert)             | `lib/fxRates.ts:23`                       | LOCKED |
| Bulk upsert is atomic (no partial writes)     | `lib/fxRates.ts:255-266`                  | LOCKED |
| Every update attempt logged in `fx_rate_runs` | `scripts/update-fx-rates-auto.ts:206-252` | LOCKED |

### Currency Mapping

| Invariant                            | Location                           | Status |
| ------------------------------------ | ---------------------------------- | ------ |
| EBAY_US → USD                        | `lib/markets.ts:19-24`             | LOCKED |
| EBAY_CA → CAD                        | `lib/markets.ts:19-24`             | LOCKED |
| EBAY_GB → GBP                        | `lib/markets.ts:19-24`             | LOCKED |
| EBAY_AU → AUD                        | `lib/markets.ts:19-24`             | LOCKED |
| Currency mismatch detected at ingest | `scripts/update-listings.ts:83-94` | LOCKED |

### Price Validation

| Invariant                                     | Location                                                   | Status           |
| --------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| Negative prices clamped to 0 at API layer     | `lib/priceGuard.ts`, `app/api/deals/dealsQuery.ts:462-541` | LOCKED (PR #125) |
| Missing FX rate sets `total_price_cad = null` | `scripts/update-listings.ts:302-304`                       | LOCKED           |
| Discount clamp ±150% for untrusted sellers    | `lib/pricing.ts:30,52-54`                                  | LOCKED           |

---

## 4) Risk Findings

### Risk 1: Hardcoded FX Rate in `lib/money.ts`

**Path**: `lib/money.ts:4`

**What it does**: `FX_CAD_TO_USD = 0.74` is a static constant used by `convertCad()` and `formatMoneyFromCad()` for display-time CAD→USD conversion.

**When used**: Called from `app/api/deals/dealsQuery.ts:489` to compute `historicPriceUsd` for API responses. Also used in various UI formatting paths.

**Risk**: This bypasses the DB FX rates entirely. If CAD/USD moves significantly from 0.74, display values will be incorrect. This affects:

- Historic price USD display
- Any UI component using `formatMoneyFromCad()`

### Risk 2: Dual FX Systems

**Paths**:

- Ingest-time: `lib/fxRates.ts` (DB-backed, hourly updates)
- Display-time: `lib/money.ts` (hardcoded 0.74)

**Risk**: Two independent FX systems can produce inconsistent values. A listing ingested at CAD rate 0.72 will display with rate 0.74.

### Risk 3: FX Cache TTL of 1 Hour

**Path**: `lib/fxRates.ts:11`

**Risk**: During volatile currency markets, cached rates may be stale. No warning is logged when cache exceeds normal freshness thresholds.

### Risk 4: Missing FX Rate Handling

**Path**: `lib/fxRates.ts:155-157`, `scripts/update-listings.ts:295-304`

**Behavior**: If FX rate is missing for a currency:

- `convertToUSD()` returns null
- Ingest sets `total_price_cad = null` (row excluded from legacy ranking)
- Warning logged but no alerting

**Risk**: Silent data gaps if a currency is missing from `fx_rates` table.

### Risk 5: Legacy `*_cad` Field Naming

**Paths**: `lib/pricing.ts`, `app/api/deals/dealsQuery.ts`, DB columns

**Risk**: Fields named `*_cad` actually store native currency (not CAD specifically). This causes confusion and potential bugs when developers assume CAD semantics.

---

## 5) Hardening Opportunities

### MUST (Small, High-Safety)

| #   | Opportunity                                             | File                                 | Minimal Fix                                                                               | Test Idea                                         |
| --- | ------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Log warning when FX cache age exceeds 2 hours           | `lib/fxRates.ts`                     | Add timestamp check in `getFXRateSnapshots()`, log if `now - updatedAt > 2h` for any rate | Unit test: mock stale rate, verify warning logged |
| 2   | Add explicit `convertToUSD()` unit test proving formula | `lib/__tests__/unit/fxRates.test.ts` | Add test: `convertToUSD(100, 'CAD')` with mocked rate 0.72 → expect 72.0                  | Already a test gap identified                     |

### SHOULD (Small but Optional)

| #   | Opportunity                                               | File                          | Notes                                                         |
| --- | --------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| 1   | Document hardcoded FX in `lib/money.ts` with TODO comment | `lib/money.ts`                | Add comment: "TODO: Replace with DB lookup (see M03 risk #1)" |
| 2   | Add currency field to API response schema explicitly      | `app/api/deals/dealsQuery.ts` | Already present; document in types                            |
| 3   | Rename `*_cad` to `*_native` in new code only             | Future code                   | Don't migrate existing; just use correct names going forward  |

### LATER (Requires Refactor)

| #   | Opportunity                                            | File                         | Effort                                        |
| --- | ------------------------------------------------------ | ---------------------------- | --------------------------------------------- |
| 1   | Replace hardcoded `lib/money.ts` FX with DB lookup     | `lib/money.ts`               | L - Requires async refactor of all callers    |
| 2   | Rename all `*_cad` DB columns to `*_native`            | DB migration                 | XL - Requires migration + all code references |
| 3   | Add FX staleness alerting (not just logging)           | `lib/fxRates.ts` + alerting  | M - Requires alerting infrastructure          |
| 4   | Add integration test: ingest → display price roundtrip | `lib/__tests__/integration/` | L - Requires test DB setup                    |

---

## 6) Tests Coverage Gaps

### Existing Tests

| Area                      | File                                          | Coverage           |
| ------------------------- | --------------------------------------------- | ------------------ |
| FX rate bounds validation | `lib/__tests__/unit/fxRates.test.ts`          | Adequate           |
| FX drift classification   | `lib/__tests__/unit/fxRates.test.ts`          | Adequate           |
| Negative price guard      | `lib/__tests__/unit/clampNonNegative.test.ts` | Adequate (PR #125) |
| Market currency mapping   | `lib/__tests__/unit/markets.test.ts`          | Adequate           |
| Discount computation      | `lib/__tests__/unit/dealConfidence.test.ts`   | Partial            |

### Missing Tests

| Gap                                    | Current State         | Suggested Location                       | Priority                     |
| -------------------------------------- | --------------------- | ---------------------------------------- | ---------------------------- |
| `convertToUSD()` formula verification  | No direct test        | `lib/__tests__/unit/fxRates.test.ts`     | HIGH                         |
| `convertCad()` hardcoded rate behavior | No test               | `lib/__tests__/unit/money.test.ts` (new) | MEDIUM                       |
| FX cache staleness warning             | No test               | `lib/__tests__/unit/fxRates.test.ts`     | LOW (if MUST #1 implemented) |
| End-to-end price roundtrip             | Missing (requires DB) | `lib/__tests__/integration/`             | LOW                          |

---

## 7) Summary

The pricing + FX system has two independent conversion paths:

1. **Ingest-time**: Uses DB-backed FX rates from `lib/fxRates.ts` with hourly updates, validation bounds, and drift detection. This is well-designed with atomic writes and audit logging.

2. **Display-time**: Uses hardcoded `FX_CAD_TO_USD = 0.74` from `lib/money.ts`. This bypasses DB rates entirely.

**Key strengths**:

- FX rate validation with hard bounds [0.0001, 10000]
- Drift detection with automatic hold (>5% suspect, >15% failed)
- Atomic bulk upserts prevent partial writes
- Audit logging in `fx_rate_runs` table
- Negative price guard at API layer (PR #125)

**Key risks**:

1. Hardcoded FX rate bypasses DB rates for display
2. Dual FX systems can produce inconsistent values
3. No staleness warning when FX cache is old
4. Silent data gaps when FX rate is missing
5. Confusing `*_cad` naming (stores native, not CAD)

**Recommended immediate actions (PR B candidates)**:

1. Add warning when FX cache exceeds 2 hours stale
2. Add unit test for `convertToUSD()` formula verification

---

## 8) PR B Hardening Applied

- **PR #127**: Explicit `[FX_RATE_MISSING]` warning in non-production when `getFXRate()` or `convertToUSD()` cannot find a currency. Unit tests for `getFXRate` and `convertToUSD` added via cache injection helper.
- **PR #128**: Deduped dev log; warning now emits only from `convertToUSD()`.

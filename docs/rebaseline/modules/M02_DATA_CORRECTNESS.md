# Module 02: Data Correctness Path Review

**Created**: 2025-12-29
**Status**: COMPLETE (Review)
**PR**: TBD

---

## Overview

This document maps the complete data correctness path from ingestion to display, identifying correctness invariants, risk points, and hardening opportunities.

---

## 1) Path Map

### Ingest

Data enters the system through scheduled scripts that fetch from external APIs.

| File                                  | Function(s)                                                               | Purpose                                       |
| ------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `scripts/update-listings.ts`          | `main()`, `processCard()`, `upsertListing()`                              | Fetch active eBay listings                    |
| `scripts/update-sold-listings.ts`     | `main()`, `insertSoldListing()`                                           | Fetch eBay sold/completed listings            |
| `scripts/update-historical-prices.ts` | `main()`, `fetchRecentSoldGroups()`, `upsertHistoricalPrice()`            | Compute median historical prices              |
| `scripts/update-fx-rates.ts`          | `main()`, `fetchOpenExchangeRates()`                                      | Fetch FX rates from OpenExchangeRates         |
| `scripts/update-fx-rates-auto.ts`     | `main()`                                                                  | Automated FX rate update with drift detection |
| `lib/ebay.ts`                         | `fetchEbayListings()`, `fetchEbaySoldListings()`, `fetchEbayItemDetail()` | eBay Browse API integration                   |

### Normalize

Raw data is parsed, validated, and normalized before storage.

| File                         | Function(s)                                                                               | Purpose                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `lib/ebay.ts`                | `normalizeCondition()`, `cleanTitle()`, `findBannedTitleKeyword()`                        | Condition bucket mapping, title cleanup       |
| `lib/markets.ts`             | `normalizeMarketCode()`, `getExpectedCurrency()`                                          | Market code normalization, currency lookup    |
| `lib/collectorNumber.ts`     | `extractCollectorNumber()`, `normalizeCollectorNumber()`, `shouldRejectCollectorNumber()` | Collector number parsing/matching             |
| `lib/fxRates.ts`             | `convertToUSD()`, `validateFXRateDirection()`, `getFXRate()`                              | Currency conversion with validation           |
| `lib/language.ts`            | `detectCardLanguage()`                                                                    | Language detection from title                 |
| `scripts/update-listings.ts` | `detectMarketCurrencyMismatch()`, `computeIntegrityStatus()`                              | Currency/market validation, integrity scoring |

### Score

Deal quality is computed from normalized data.

| File                    | Function(s)                                                                                   | Purpose                                            |
| ----------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `lib/pricing.ts`        | `computeDiscountPercent()`, `getDisplayDiscountPercent()`                                     | Discount calculation with clamping                 |
| `lib/dealScore.ts`      | `computeDealScore()`, `isDealTrusted()`                                                       | Overall deal score (0-100)                         |
| `lib/dealConfidence.ts` | `computeDealConfidenceWeight()`, `computeSampleConfidence()`, `computeDispersionConfidence()` | Confidence weighting based on sample size/variance |
| `lib/dealSort.ts`       | `compareStrictBestDiscountValues()`                                                           | Sort comparator for deals                          |
| `lib/baselineUsd.ts`    | `computeBaselineMedianUsd()`, `computeTrimmedMedian()`                                        | USD baseline calculation with outlier trim         |
| `lib/blacklist.ts`      | `getBlacklistReason()`, `shouldExcludeListingFromCardSurfaces()`, `checkListingOverride()`    | Exclusion rules + DB overrides                     |

### Display

Computed data is served via API and rendered in UI.

| File                              | Function(s)                                            | Purpose                             |
| --------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| `app/api/deals/route.ts`          | `GET()`                                                | Deals API endpoint                  |
| `app/api/deals/dealsQuery.ts`     | `runDealsQuery()`, `fetchListings()`, `transformRow()` | Query builder + row transformation  |
| `lib/money.ts`                    | `convertCad()`, `formatMoneyFromCad()`                 | Display currency conversion         |
| `lib/dealFormatting.ts`           | `formatDiscount()`, `formatPrice()`                    | UI formatting functions             |
| `lib/dealViewModel.ts`            | `toDealViewModel()`                                    | Transform DB row to UI-ready object |
| `lib/whyDeal.ts`                  | `getWhyDealFactors()`                                  | Explainer for deal score components |
| `components/DealsTable.tsx`       | `DealsTable`                                           | Main deals table component          |
| `components/CardDetailClient.tsx` | `CardDetailClient`                                     | Card detail page with listings      |

---

## 2) Correctness Invariants (LOCKED Candidates)

### Currency Handling

| Invariant                                           | Location(s)                                         | Status |
| --------------------------------------------------- | --------------------------------------------------- | ------ |
| FX rates stored as `rate_to_usd` (USD per 1 native) | `lib/fxRates.ts:14-18`, DB `fx_rates` table         | LOCKED |
| Conversion formula: `native × rate_to_usd = USD`    | `lib/fxRates.ts:159`                                | LOCKED |
| FX rate bounds: `[0.0001, 10000]`                   | `lib/fxRates.ts:17-18`, `validateFXRateDirection()` | LOCKED |
| Drift detection: >5% = SUSPECT, >15% = FAILED       | `lib/fxRates.ts:22-23`                              | LOCKED |
| USD rounding to 6 decimal places                    | `lib/fxRates.ts:162`                                | LOCKED |

### Canonical IDs and Dedup

| Invariant                                            | Location(s)                                   | Status |
| ---------------------------------------------------- | --------------------------------------------- | ------ |
| Listings keyed by `(listing_id, market)`             | `scripts/update-listings.ts` upsert logic     | LOCKED |
| Cards keyed by `id` (auto-increment PK)              | DB `cards` table                              | LOCKED |
| Collector number mismatch rejects at MED+ confidence | `lib/collectorNumber.ts:211-235`              | LOCKED |
| Historical prices keyed by `(card_id, market)`       | `scripts/update-historical-prices.ts:129-147` | LOCKED |

### Market Normalization

| Invariant                                                     | Location(s)                        | Status |
| ------------------------------------------------------------- | ---------------------------------- | ------ |
| Supported markets: `EBAY_US`, `EBAY_CA`, `EBAY_GB`, `EBAY_AU` | `lib/markets.ts:1-6`               | LOCKED |
| Default market: `EBAY_US`                                     | `lib/markets.ts:10`                | LOCKED |
| Market → Currency mapping is fixed                            | `lib/markets.ts:19-24`             | LOCKED |
| Currency mismatch detection at ingest                         | `scripts/update-listings.ts:83-94` | LOCKED |

### Exclusion/Blacklist Rules

| Invariant                                             | Location(s)                              | Status |
| ----------------------------------------------------- | ---------------------------------------- | ------ |
| DB overrides checked FIRST (highest precedence)       | `lib/blacklist.ts:69-74`                 | LOCKED |
| Override types: `ALLOW`, `HARD_BLOCK`, `SOFT_EXCLUDE` | `lib/schema.ts` OverrideType             | LOCKED |
| Soft exclusion hides from card surfaces, not DB       | `lib/blacklist.ts:12-13`                 | LOCKED |
| Banned keywords checked at ingest + query-side        | `lib/ebay.ts:61-271`, `lib/blacklist.ts` | LOCKED |

---

## 3) Known Risk Points

| #   | Risk                                                | Path(s)                                       | Why Risky                                         |
| --- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| 1   | Hardcoded FX rate in `lib/money.ts`                 | `lib/money.ts:4`                              | `FX_CAD_TO_USD = 0.74` bypasses DB FX rates       |
| 2   | Legacy CAD field naming                             | `lib/pricing.ts`, `dealsQuery.ts`, DB columns | Fields named `*_cad` but store native currency    |
| 3   | FX rate cache TTL of 1 hour                         | `lib/fxRates.ts:11`                           | Stale rates possible during volatile markets      |
| 4   | Override cache TTL of 60 seconds                    | `lib/blacklist.ts:29`                         | Override changes not immediately visible          |
| 5   | Discount clamping hides extreme values              | `lib/pricing.ts:30,52-54`                     | ±150% clamp may hide data issues                  |
| 6   | No validation on negative prices at API layer       | `app/api/deals/dealsQuery.ts`                 | Relies on ingest-time validation only             |
| 7   | Collector number extraction from title is heuristic | `lib/collectorNumber.ts:115-189`              | Title patterns may produce false matches          |
| 8   | Sold listing price uses `priceCad` field naming     | `scripts/update-sold-listings.ts:44-47`       | Confusing naming; actually stores native currency |

---

## 4) Hardening Opportunities

### MUST (Small, High-Safety)

| #   | Opportunity                                                             | File(s)                                       | Effort |
| --- | ----------------------------------------------------------------------- | --------------------------------------------- | ------ |
| 1   | Add guard: reject negative `total_price` at API response transformation | `app/api/deals/dealsQuery.ts`                 | S      |
| 2   | Add test: FX conversion formula matches canonical definition            | `lib/__tests__/unit/fxRates.test.ts` (new)    | S      |
| 3   | Add test: discount clamping behavior documented                         | `lib/__tests__/unit/pricing.test.ts` (exists) | S      |
| 4   | Add safety gate test for M01 purge script confirmation flags            | `scripts/__tests__/unit/` (new)               | S      |

### SHOULD (Small but Optional)

| #   | Opportunity                                                              | File(s)                       | Effort |
| --- | ------------------------------------------------------------------------ | ----------------------------- | ------ |
| 1   | Rename `*_cad` fields to `*_native` in new code (don't migrate existing) | Future ingestion changes      | M      |
| 2   | Log warning when FX rate cache exceeds 2 hours stale                     | `lib/fxRates.ts`              | S      |
| 3   | Add explicit currency field to API response schema                       | `app/api/deals/dealsQuery.ts` | S      |

### LATER (Requires Refactor, Deferred)

| #   | Opportunity                                                    | File(s)                       | Effort |
| --- | -------------------------------------------------------------- | ----------------------------- | ------ |
| 1   | Replace hardcoded `lib/money.ts` FX rate with DB lookup        | `lib/money.ts`                | L      |
| 2   | Rename all `*_cad` DB columns to `*_native`                    | DB migration + all references | XL     |
| 3   | Add end-to-end price correctness integration test              | `lib/__tests__/integration/`  | L      |
| 4   | Refactor `CardDetailClient.tsx` (65KB) into smaller components | `components/`                 | XL     |

---

## 5) Tests Coverage Gaps

| Gap                                           | Current State                                | Suggested Location                     |
| --------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| FX rate direction validation                  | Has tests in `fxRates.test.ts`               | Adequate                               |
| FX conversion formula                         | Has tests in `fxRates.test.ts`               | Adequate                               |
| Discount computation edge cases               | Has tests in `dealConfidence.test.ts`        | Could add negative price test          |
| Collector number gating                       | Has tests in `collectorNumberGating.test.ts` | Adequate                               |
| Market currency guard                         | Has tests in `marketCurrency.test.ts`        | Adequate                               |
| API response negative price guard             | **MISSING**                                  | `lib/__tests__/unit/` or API tests     |
| Safety gate confirmation flags                | **MISSING**                                  | `scripts/__tests__/unit/purge.test.ts` |
| End-to-end ingest → display price correctness | **MISSING** (requires DB)                    | `lib/__tests__/integration/`           |

---

## 6) Acceptance Criteria

- [x] Path map complete (Ingest → Normalize → Score → Display)
- [x] Correctness invariants documented
- [x] Risk points identified with paths
- [x] Hardening opportunities categorized (MUST/SHOULD/LATER)
- [x] Test coverage gaps identified
- [ ] SHIFT_LOCK updated with Safety Gate Test Requirement
- [ ] SHIFT_LOCK updated with Operator Command Policy

---

## 7) Summary

The data correctness path is well-structured with clear separation of concerns:

1. **Ingest** scripts fetch from eBay APIs and store with market/currency context
2. **Normalize** functions handle condition mapping, market codes, collector numbers, and FX conversion
3. **Score** functions compute discounts, confidence weights, and deal scores
4. **Display** APIs query and transform data for UI consumption

Key strengths:

- FX rate validation with hard bounds and drift detection
- Collector number confidence-based gating
- DB-backed override system with caching
- Comprehensive banned keyword list

Key risks:

- Hardcoded FX rate in `lib/money.ts` bypasses DB rates
- Legacy `*_cad` naming is confusing (fields store native currency)
- Cache TTLs may cause brief stale data visibility

Recommended immediate actions (PR B candidates):

1. Add negative price guard at API layer
2. Add safety gate test for M01 confirmation flags
3. Document discount clamping behavior in tests

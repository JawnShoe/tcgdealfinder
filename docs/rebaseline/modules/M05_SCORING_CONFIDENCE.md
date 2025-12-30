# M05: Scoring + Confidence Review

**Module**: M05 — Scoring + Confidence
**Status**: REVIEW COMPLETE
**Date**: 2025-12-30

---

## 1) Path Map

### Confidence Weight Calculation

| Location              | Path                    | Line(s)      | Description                                                                                         |
| --------------------- | ----------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| Sample confidence     | `lib/dealConfidence.ts` | 8-13, 31-43  | `computeSampleConfidence()` — thresholds: ≥20→1.0, ≥10→0.8, ≥5→0.6, ≥2→0.4, else 0.2                |
| Dispersion confidence | `lib/dealConfidence.ts` | 15-20, 45-66 | `computeDispersionConfidence()` — CV thresholds: ≤0.15→1.0, ≤0.25→0.8, ≤0.4→0.6, ≤0.6→0.4, else 0.2 |
| Shipping confidence   | `lib/dealConfidence.ts` | 22-26, 68-89 | `computeShippingConfidence()` — ratio thresholds: ≤0.15→1.0, ≤0.3→0.8, ≤0.5→0.6, else 0.4           |
| Composite weight      | `lib/dealConfidence.ts` | 95-109       | `computeDealConfidenceWeight()` — weighted: sample×0.45 + dispersion×0.35 + shipping×0.2            |
| Clamp to range        | `lib/dealConfidence.ts` | 91-93        | `clampConfidenceWeight()` — floor 0.2, ceiling 1.0                                                  |
| Weight to label       | `lib/dealConfidence.ts` | 111-120      | `getConfidenceLabel()` — ≥0.8→"high", ≥0.55→"medium", else "low"                                    |
| Apply to score        | `lib/dealConfidence.ts` | 122-134      | `applyConfidenceToScore()` — multiplies baseScore × clampedWeight                                   |

### Deal Score Calculation

| Location          | Path               | Line(s) | Description                                                                                       |
| ----------------- | ------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| Trust constants   | `lib/dealScore.ts` | 3-4     | `TRUST_FEEDBACK_THRESHOLD=20`, `TRUST_POSITIVE_PERCENT=98`                                        |
| Trust check       | `lib/dealScore.ts` | 6-17    | `isDealTrusted()` — feedback≥20 AND positive≥98%                                                  |
| Legacy confidence | `lib/dealScore.ts` | 19-29   | `getDealConfidence()` — ≥50→"high", ≥20→"medium", ≥5→"low", else null                             |
| Base score        | `lib/dealScore.ts` | 38-77   | `computeDealScore()` — discount×2 (cap 60) + trusted(+15) + urgency(+15/10/5) + confidence(+10/5) |

### Baseline/Historic Pricing

| Location             | Path                 | Line(s) | Description                                                               |
| -------------------- | -------------------- | ------- | ------------------------------------------------------------------------- |
| Trim count           | `lib/baselineUsd.ts` | 13-20   | `computeTrimCount()` — floor(sampleSize × trimPercent/100)                |
| Trimmed median       | `lib/baselineUsd.ts` | 29-61   | `computeTrimmedMedian()` — sorts, trims tails, returns median             |
| Baseline computation | `lib/baselineUsd.ts` | 63-105  | `computeBaselineMedianUsd()` — primary window fallback to extended window |

### Discount Calculation

| Location         | Path             | Line(s) | Description                                                         |
| ---------------- | ---------------- | ------- | ------------------------------------------------------------------- |
| Raw discount     | `lib/pricing.ts` | 1-22    | `computeDiscountPercent()` — (current-historic)/historic × 100      |
| Display discount | `lib/pricing.ts` | 34-56   | `getDisplayDiscountPercent()` — clamps non-trusted sellers to ±150% |
| Trust constants  | `lib/pricing.ts` | 31-32   | `HIGH_TRUST_FEEDBACK=50`, `HIGH_TRUST_POSITIVE=99`                  |

### Where Applied

| Layer          | Path                          | Line(s) | Description                                                           |
| -------------- | ----------------------------- | ------- | --------------------------------------------------------------------- |
| Ingest         | `scripts/update-listings.ts`  | 312-316 | Computes `discount_percent`, stores `historic_price_cad`              |
| Query          | `app/api/deals/dealsQuery.ts` | 491-498 | Loads or computes `deal_confidence_weight`                            |
| Query ordering | `app/api/deals/dealsQuery.ts` | 593-603 | ORDER BY discount ASC, confidence_weight DESC, total ASC, ends_at ASC |
| Display        | `lib/dealViewModel.ts`        | 94-110  | Optional score computation with confidence applied                    |

---

## 2) Locked Invariants (Candidates)

### L1: Confidence Weight Range

- **Range**: [0.2, 1.0]
- **Why**: Floor of 0.2 ensures low-confidence deals are deprioritized but never hidden
- **Evidence**: `lib/dealConfidence.ts:91-93`

### L2: Confidence Weight Formula

- **Formula**: sample×0.45 + dispersion×0.35 + shipping×0.2
- **Why**: Sample size is most reliable indicator; shipping realism is least reliable
- **Evidence**: `lib/dealConfidence.ts:106-107`

### L3: Seller Trust Thresholds (Score)

- **Thresholds**: feedback≥20 AND positive≥98%
- **Bonus**: +15 points to deal score
- **Evidence**: `lib/dealScore.ts:3-4, 54-56`

### L4: Seller Trust Thresholds (Display Discount)

- **High trust**: feedback≥50 AND positive≥99% → no clamping
- **Lower trust**: discount clamped to ±150%
- **Why**: Prevents extreme outlier discounts from untrusted sellers
- **Evidence**: `lib/pricing.ts:31-32, 34-56`

### L5: Deal Score Range

- **Range**: [0, 100] (integer)
- **Base cap**: 60 points from discount (30% off = max)
- **Bonus cap**: +15 (trusted) + 15 (urgency) + 10 (confidence) = 40 max bonus
- **Evidence**: `lib/dealScore.ts:52, 76`

### L6: Baseline Parameters

- **Primary window**: 90 days
- **Fallback window**: 180 days
- **Minimum comps**: 30
- **Trim percent**: 5% per tail
- **Evidence**: SSOT "Deal Systems" section; `lib/baselineUsd.ts:63-78`

### L7: Query Ordering (best sort)

- **Order**: discount ASC (best first) → confidence_weight DESC → total ASC → ends_at ASC
- **Why**: Best deals prioritized, then confidence, then price, then urgency
- **Evidence**: `app/api/deals/dealsQuery.ts:593-603`

---

## 3) Known Risk Points

### R1: Two Different Trust Threshold Sets

- **Path**: `lib/dealScore.ts:3-4` vs `lib/pricing.ts:31-32`
- **Issue**: dealScore uses 20/98%, pricing uses 50/99% for high trust
- **Impact**: A seller with 30 feedback and 98.5% is "trusted" for score bonus but NOT for discount unclamping
- **Severity**: Low (intentional design: stricter threshold for discount display)

### R2: Legacy getDealConfidence() vs Modern Weight System

- **Path**: `lib/dealScore.ts:19-29` vs `lib/dealConfidence.ts:95-109`
- **Issue**: Two parallel confidence systems with different thresholds
- **Impact**: Score uses legacy (50/20/5 sample thresholds); weight uses modern (20/10/5/2 + dispersion + shipping)
- **Severity**: Medium (confusing; should consolidate in future)

### R3: stdDev Not Tracked at Ingest

- **Path**: `app/api/deals/dealsQuery.ts:496`
- **Issue**: `stdDev: null` passed to `computeDealConfidenceWeight()` — dispersion score defaults to 0.5
- **Impact**: Dispersion confidence (35% of weight) is always neutral
- **Severity**: Medium (confidence weight is less discriminating than designed)

### R4: No Unit Tests for computeDealScore()

- **Path**: `lib/dealScore.ts`
- **Issue**: No tests for base score calculation, urgency bonuses, or edge cases
- **Impact**: Could silently break on refactor
- **Severity**: Medium

### R5: Graded Card Baseline Gate Undocumented

- **Path**: `app/api/deals/dealsQuery.ts:482-484`
- **Issue**: Graded cards (PSA/BGS/CGC) require ≥5 comps to show baseline; raw cards have no minimum
- **Impact**: Not in SSOT; could be forgotten
- **Severity**: Low (defensive behavior, just undocumented)

---

## 4) Hardening Opportunities

### MUST (Required for correctness)

None identified — current implementation is correct per SSOT.

### SHOULD (Recommended hardening)

| ID  | Description                                                                                                    | Path                                        | Effort |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------ |
| S1  | Add unit tests for `computeDealScore()`                                                                        | New test file                               | Small  |
| S2  | Add unit tests for `computeSampleConfidence()`, `computeDispersionConfidence()`, `computeShippingConfidence()` | `lib/__tests__/unit/dealConfidence.test.ts` | Small  |
| S3  | Document graded card baseline gate in SSOT                                                                     | `PROJECT_SSOT.md`                           | Tiny   |

### LATER (Requires refactor — PAUSED during rebaseline)

| ID  | Description                                                        | Path                                        | Notes                 |
| --- | ------------------------------------------------------------------ | ------------------------------------------- | --------------------- |
| L1  | Unify trust threshold constants                                    | `lib/dealScore.ts`, `lib/pricing.ts`        | Needs design decision |
| L2  | Consolidate legacy `getDealConfidence()` with modern weight system | `lib/dealScore.ts`, `lib/dealConfidence.ts` | Behavior change       |
| L3  | Track stdDev at ingest for proper dispersion confidence            | `scripts/update-listings.ts`                | Schema change         |

---

## 5) Test Coverage Gaps

### Gap 1: computeDealScore() (Priority: HIGH)

**What to test**:

- Discount multiplier: 30% off → 60 points, 50% off → still 60 (capped)
- Trusted seller bonus: +15 points
- Urgency bonuses: ≤6h→+15, ≤24h→+10, ≤72h→+5, >72h→+0, ended→+0
- Confidence bonus: high→+10, medium→+5, low/null→+0
- Score range clamping: never <0, never >100
- Null discount → 0 score

**Where**: `lib/__tests__/unit/dealScore.test.ts` (new file)

### Gap 2: Individual Confidence Sub-Functions (Priority: MEDIUM)

**What to test**:

- `computeSampleConfidence()`: boundary values at 2, 5, 10, 20
- `computeDispersionConfidence()`: boundary CV values at 0.15, 0.25, 0.4, 0.6
- `computeShippingConfidence()`: boundary ratios at 0.15, 0.3, 0.5
- Null/invalid inputs → default scores

**Where**: Extend `lib/__tests__/unit/dealConfidence.test.ts`

### Gap 3: getDisplayDiscountPercent() (Priority: MEDIUM)

**What to test**:

- High-trust seller (50+ feedback, 99%+) → unclamped discount
- Lower-trust seller → discount clamped to ±150%
- Edge cases at threshold boundaries

**Where**: `lib/__tests__/unit/pricing.test.ts` (new or existing)

---

## 6) SSOT Reconciliation

**SSOT states** (PROJECT_SSOT.md "Deal Systems"):

> "Deal confidence weight" is a multiplier (0.2–1.0) based on sample size, price dispersion, and shipping realism.

**Code implements**:

- ✅ Weight range [0.2, 1.0] — matches (clampConfidenceWeight)
- ✅ Sample + dispersion + shipping factors — matches (though stdDev currently null)
- ✅ Formula: sample×0.45 + dispersion×0.35 + shipping×0.2 — implemented

**Discrepancy**: None found. Code matches SSOT.

---

## 7) Deferred Items

- L1, L2, L3 from Hardening Opportunities are deferred until rebaseline completes
- R3 (stdDev tracking) is a schema/ingest change, deferred

---

## 8) PR A Review Applied

- **PR #134**: Docs-only review of scoring and confidence implementation. Path map, locked invariants, risk findings, and test coverage gaps documented.
- **PR #135**: Unit tests added for `computeDealScore()`, `isDealTrusted()`, `getDealConfidence()`, all confidence sub-functions, and null-stdDev behavior documentation.

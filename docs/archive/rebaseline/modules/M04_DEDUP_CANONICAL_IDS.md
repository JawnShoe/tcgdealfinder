# M04: Dedup + Canonical IDs Review

**Module**: M04 — Dedup + Canonical IDs
**Status**: REVIEW COMPLETE
**Date**: 2025-12-30

---

## 1) Path Map

### Canonical ID

| Location           | Path                              | Line(s)      | Description                                                                                       |
| ------------------ | --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| Schema (stale)     | `scripts/init-db.ts`              | 39, 74       | Declares `listing_id TEXT NOT NULL` + `UNIQUE (listing_id)` — but this is superseded by migration |
| Migration (active) | `migrations/001_add_fx_rates.sql` | 43, 46-47    | Drops old `UNIQUE (listing_id)`, creates `UNIQUE (listing_id, market)` index                      |
| Upsert             | `scripts/update-listings.ts`      | 450          | `ON CONFLICT (listing_id, market) DO UPDATE SET ...`                                              |
| API mapping        | `app/api/deals/dealsQuery.ts`     | 38, 320, 549 | `listing_id` column read and mapped to `Deal.listingId`                                           |
| Display fallback   | `components/DealsTable.tsx`       | 108          | `deal.listingId ?? String(deal.id)` — fallback to numeric DB id                                   |

### Dedup (Cross-Market)

| Location                 | Path                        | Line(s) | Description                                                   |
| ------------------------ | --------------------------- | ------- | ------------------------------------------------------------- |
| Market priority constant | `components/DealsTable.tsx` | 95      | `MARKET_PRIORITY: ["US", "CA", "GB", "AU"]`                   |
| Market rank function     | `components/DealsTable.tsx` | 97-103  | `getMarketRank()` returns 0-4 (unknown markets = 4)           |
| Dedup function           | `components/DealsTable.tsx` | 105-129 | `dedupeDealsByListing()` — selects one listing per listing_id |
| Dedup application        | `components/DealsTable.tsx` | 368-371 | `useMemo(() => dedupeDealsByListing(baseDeals), [baseDeals])` |

### Tie-Breakers

| Location          | Path                        | Line(s) | Description                                                             |
| ----------------- | --------------------------- | ------- | ----------------------------------------------------------------------- |
| Price tie-breaker | `components/DealsTable.tsx` | 120-125 | When markets have same rank, select listing with lowest `totalPriceCad` |

### Where Applied (Ingest vs Query vs Display)

| Layer              | Applied?        | Path                                   | Notes                                                                                        |
| ------------------ | --------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Ingest**         | Partial         | `scripts/update-listings.ts:450`       | Upsert dedupes per `(listing_id, market)` — same listing in same market updates existing row |
| **Query (API)**    | No              | `app/api/deals/dealsQuery.ts`          | Returns all matching rows; no cross-market dedup at API layer                                |
| **Display**        | Yes             | `components/DealsTable.tsx:368-371`    | `dedupeDealsByListing()` runs in React `useMemo` at render time                              |
| **Featured Deals** | Different logic | `components/FeaturedDeals.tsx:194-212` | Dedupes by **cardId** (one listing per card), not listing_id                                 |

---

## 2) Locked Invariants (Candidates)

### L1: Canonical ID Definition

- **Canonical ID**: `listing_id` (eBay item ID string)
- **Fallback**: Numeric `id` (database serial primary key) when `listing_id` is null
- **Evidence**: `DealsTable.tsx:108` — `(deal.listingId ?? String(deal.id)).toString()`

### L2: Cross-Market Dedup Rule

- **Priority Order**: US → CA → GB → AU → others (rank 0-4)
- **Selection**: Keep listing from highest-priority market (lowest rank number)
- **Evidence**: `DealsTable.tsx:95-118`

### L3: No Fuzzy Merge

- Listings with **different listing_id values are never merged**
- Dedup key is exact string match on `listing_id` (or fallback `id`)
- No similarity/fuzzy matching logic exists in codebase
- **Evidence**: `DealsTable.tsx:108` uses exact key lookup in Map

### L4: Tie-Breaker Rule

- When two listings have the **same market rank**, select the one with **lowest totalPriceCad**
- `POSITIVE_INFINITY` used when price is null (deprioritizes missing prices)
- **Evidence**: `DealsTable.tsx:120-125`

### L5: Database Uniqueness

- **Active constraint**: `UNIQUE (listing_id, market)` via index
- Same eBay item can exist in multiple markets as separate DB rows
- Same item in same market updates existing row (upsert)
- **Evidence**: `migrations/001_add_fx_rates.sql:46-47`

---

## 3) Known Risk Points

### R1: Stale Schema in init-db.ts

- **Path**: `scripts/init-db.ts:74`
- **Issue**: Still declares `UNIQUE (listing_id)` but migration drops this and creates `UNIQUE (listing_id, market)`
- **Impact**: Fresh DB init would create wrong constraint; production uses migrated schema
- **Severity**: Medium (affects new dev environments)

### R2: Dedup Only at Display Layer

- **Path**: `components/DealsTable.tsx:368-371`
- **Issue**: Cross-market dedup happens in React component, not at query layer
- **Impact**: API returns duplicates; client must dedup; different clients could see different results
- **Severity**: Low (current architecture intentional, but could cause inconsistency if other clients added)

### R3: FeaturedDeals Uses Different Dedup Logic

- **Path**: `components/FeaturedDeals.tsx:194-212`
- **Issue**: Dedupes by `cardId`, not `listing_id`; first-seen wins (no market priority)
- **Impact**: Featured deals may show non-US listing when US exists (depends on query order)
- **Severity**: Low (different use case: "one deal per card" vs "one per listing")

### R4: No Unit Tests for Dedup Logic

- **Path**: N/A
- **Issue**: `dedupeDealsByListing()` and `getMarketRank()` have no dedicated unit tests
- **Impact**: Priority order, tie-breaker behavior, and edge cases (null markets, unknown markets) untested
- **Severity**: Medium (could silently break on refactor)

### R5: Fallback ID Could Collide

- **Path**: `components/DealsTable.tsx:108`
- **Issue**: When `listingId` is null, falls back to `String(deal.id)`. If one deal has `listingId: "12345"` and another has `id: 12345` with null listingId, they would incorrectly merge.
- **Impact**: Theoretically possible but unlikely (listing_id is always populated in practice)
- **Severity**: Low (edge case)

---

## 4) Hardening Opportunities

### MUST (Required for correctness)

None identified — current implementation matches SSOT expectations.

### SHOULD (Recommended hardening)

| ID  | Description                                                       | Path                    | Effort |
| --- | ----------------------------------------------------------------- | ----------------------- | ------ |
| S1  | Add unit tests for `dedupeDealsByListing()` and `getMarketRank()` | New test file           | Small  |
| S2  | Fix stale schema in init-db.ts to match migrated constraint       | `scripts/init-db.ts:74` | Tiny   |

### LATER (Requires refactor — PAUSED during rebaseline)

| ID  | Description                                    | Path                           | Notes                  |
| --- | ---------------------------------------------- | ------------------------------ | ---------------------- |
| L1  | Move dedup to API layer for consistency        | `app/api/deals/dealsQuery.ts`  | Architectural change   |
| L2  | Align FeaturedDeals dedup with market priority | `components/FeaturedDeals.tsx` | Behavior change        |
| L3  | Add guard for listingId/id collision edge case | `components/DealsTable.tsx`    | Low priority edge case |

---

## 5) Test Coverage Gaps

### Gap 1: dedupeDealsByListing() (Priority: HIGH)

**What to test**:

- Market priority order: US wins over CA, CA wins over GB, etc.
- Tie-breaker: Same market → lowest totalPriceCad wins
- Unknown market gets lowest priority (rank 4)
- Null market handled gracefully
- First-seen behavior when all else equal (Map iteration order)

**Where**: `lib/__tests__/unit/dedup.test.ts` (new file) or `components/__tests__/DealsTable.test.ts`

### Gap 2: getMarketRank() (Priority: MEDIUM)

**What to test**:

- "US" → 0, "CA" → 1, "GB" → 2, "AU" → 3
- Unknown market (e.g., "DE") → 4
- Null/undefined → normalized to default market
- "all" market code → normalized to default market rank

**Where**: Same as Gap 1

### Gap 3: Fallback ID behavior (Priority: LOW)

**What to test**:

- When listingId is null, String(id) is used as key
- Two deals with same numeric id but different listingId are not merged

**Where**: Same as Gap 1

---

## 6) SSOT Reconciliation

**SSOT states** (PROJECT_SSOT.md lines 433-435):

> Cross-market dedup: Canonical listing identity is `listing_id` (fallback to numeric DB id). When duplicate listing IDs appear across markets, keep single row using priority **US → CA → GB → AU → others**. Ties fall back to lowest total price. Listings with different IDs are never fuzzy-merged.

**Code implements**:

- ✅ Canonical ID = `listing_id` with fallback to `String(id)` — matches
- ✅ Priority order US → CA → GB → AU → others — matches (`MARKET_PRIORITY` array)
- ✅ Tie-breaker = lowest `totalPriceCad` — matches
- ✅ No fuzzy merge — matches (exact key lookup only)

**Discrepancy**: None. Code matches SSOT.

---

## 7) Deferred Items

- L1, L2, L3 from Hardening Opportunities are deferred until rebaseline completes

---

## 8) PR A Review Applied

- **PR #132**: Docs-only review of canonical ID and dedup implementation. Path map, locked invariants, risk findings, and test coverage gaps documented.

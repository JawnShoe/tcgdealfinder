# M06: Blacklist + Overrides Review

**Module**: M06 — Blacklist + Overrides
**Status**: REVIEW COMPLETE
**Date**: 2025-12-30

---

## 1) Path Map

### Keyword Denylists (Source of Truth)

| Location                  | Path               | Line(s)   | Description                                                       |
| ------------------------- | ------------------ | --------- | ----------------------------------------------------------------- |
| Primary banned keywords   | `lib/ebay.ts`      | 61-110+   | `BANNED_TITLE_KEYWORDS` — 150+ terms for proxy/replica/jumbo/etc  |
| Re-export for convenience | `lib/blacklist.ts` | 114       | Re-exports `BANNED_TITLE_KEYWORDS` from ebay.ts                   |
| Replica keywords          | `lib/blacklist.ts` | 124-147   | `REPLICA_KEYWORDS` — English + international replica terms        |
| Non-card materials        | `lib/blacklist.ts` | 152-170   | `NON_CARD_MATERIAL_KEYWORDS` — acrylic, metal, stainless, etc     |
| Display case keywords     | `lib/blacklist.ts` | 175-209   | `DISPLAY_CASE_KEYWORDS` — holders, frames, toploaders, etc        |
| Art-only keywords         | `lib/blacklist.ts` | 215-234   | `ART_ONLY_KEYWORDS` — fan art, posters, canvas (NOT alt/full art) |
| Not-single-card keywords  | `lib/blacklist.ts` | 240-276   | `NOT_A_SINGLE_CARD_KEYWORDS` — lots, bundles, sealed, booster     |
| Combined denylist         | `lib/blacklist.ts` | 281-299   | `ALL_DENYLIST_KEYWORDS` — all above with categories               |
| Soft exclusion keywords   | `lib/blacklist.ts` | 313-387   | `SOFT_EXCLUSION_KEYWORDS` — non-card merch (blankets, plush, etc) |
| eBay negative keywords    | `lib/blacklist.ts` | 1266-1292 | `EBAY_NEGATIVE_KEYWORDS` — appended to search queries             |

### Hard Contradiction Detection (Variant Filter)

| Location                | Path               | Line(s) | Description                                                    |
| ----------------------- | ------------------ | ------- | -------------------------------------------------------------- |
| Hard contradiction list | `lib/blacklist.ts` | 477-495 | `HARD_CONTRADICTION_KEYWORDS` — gold, metal, proxy, replica... |
| Card context type       | `lib/blacklist.ts` | 501-506 | `CardContext` — name, setName, number, rarity                  |
| Card number normalize   | `lib/blacklist.ts` | 519-524 | `normalizeCardNumber()` — extracts pre-slash portion           |
| Secret/alt number check | `lib/blacklist.ts` | 531-548 | `isSecretOrAltNumber()` — detects 215/203, SV-prefix, etc      |
| Rainbow rarity check    | `lib/blacklist.ts` | 553-557 | `isRainbowRarity()` — checks if rarity includes "rainbow"      |
| Variant contradiction   | `lib/blacklist.ts` | 569-626 | `getVariantContradictionReason()` — card-aware modifier filter |

### Allowlist Exceptions (False Positive Protection)

| Location               | Path               | Line(s)   | Description                                           |
| ---------------------- | ------------------ | --------- | ----------------------------------------------------- |
| Graded card indicators | `lib/blacklist.ts` | 403-416   | `GRADED_CARD_INDICATORS` — PSA/BGS/CGC grades         |
| Real card indicators   | `lib/blacklist.ts` | 422-439   | `REAL_CARD_INDICATORS` — set numbers, VMAX, GX, etc   |
| Allow despite match    | `lib/blacklist.ts` | 1149-1221 | `shouldAllowDespiteMatch()` — graded + alt art safety |
| Soft exclusion allow   | `lib/blacklist.ts` | 796-831   | `shouldAllowSoftExclusionMatch()` — hat/cap/figure    |

### Decision Functions

| Location              | Path               | Line(s)  | Description                                                 |
| --------------------- | ------------------ | -------- | ----------------------------------------------------------- |
| Title normalization   | `lib/blacklist.ts` | 452-467  | `normalizeListingText()` — lowercase, NFD, collapse spaces  |
| Blacklist reason      | `lib/blacklist.ts` | 647-729  | `getBlacklistReason()` — BANNED + denylist + variant check  |
| Soft exclusion reason | `lib/blacklist.ts` | 748-791  | `getSoftExclusionReason()` — non-card merch detection       |
| Combined sync         | `lib/blacklist.ts` | 856-943  | `shouldExcludeListingFromCardSurfacesSync()` — full check   |
| Combined async        | `lib/blacklist.ts` | 965-984  | `shouldExcludeListingFromCardSurfaces()` — with DB override |
| Batch exclusion       | `lib/blacklist.ts` | 995-1032 | `shouldExcludeListingsBatch()` — N+1 optimized batch check  |

### Database Override System

| Location              | Path                                                  | Line(s) | Description                                                |
| --------------------- | ----------------------------------------------------- | ------- | ---------------------------------------------------------- |
| Override type enum    | `lib/schema.ts`                                       | 7       | `OverrideType = "ALLOW" \| "HARD_BLOCK" \| "SOFT_EXCLUDE"` |
| Override interface    | `lib/schema.ts`                                       | 9-16    | `ListingOverride` — listing_id, type, reason, expiry       |
| Override cache        | `lib/blacklist.ts`                                    | 27-29   | In-memory cache, 60-second TTL                             |
| Fetch overrides       | `lib/blacklist.ts`                                    | 34-63   | `getOverridesCache()` — DB query with cache                |
| Check single override | `lib/blacklist.ts`                                    | 69-74   | `checkListingOverride()` — returns override or null        |
| Batch override fetch  | `lib/blacklist.ts`                                    | 81-101  | `getOverridesForListings()` — batch lookup from cache      |
| Invalidate cache      | `lib/blacklist.ts`                                    | 106-108 | `invalidateOverrideCache()` — reset timestamp              |
| Migration             | `scripts/migrations/012_create_listing_overrides.sql` | all     | Creates table + enum + indexes                             |

### Override Precedence (LOCKED)

Order checked in `shouldExcludeListingFromCardSurfacesSync()`:

1. **Database ALLOW override** → bypasses all exclusions (highest precedence)
2. **Database HARD_BLOCK override** → force exclusion
3. **Database SOFT_EXCLUDE override** → force soft exclusion
4. **Hard block rules** (`getBlacklistReason`) → fake/scam items
5. **Soft exclusion rules** (`getSoftExclusionReason`) → non-card merch

### Admin/API Routes

| Route            | Path                                      | Method | Description                             |
| ---------------- | ----------------------------------------- | ------ | --------------------------------------- |
| Allow listing    | `app/api/admin/allow-listing/route.ts`    | POST   | Create ALLOW override (mismatch review) |
| Revoke allow     | `app/api/admin/revoke-allow/route.ts`     | POST   | Delete ALLOW override                   |
| Hide listing     | `app/api/admin/hide-listing/route.ts`     | POST   | Delete from DB (adds to rejected)       |
| Blacklist seller | `app/api/admin/blacklist-seller/route.ts` | POST   | Add seller to blacklist                 |
| Debug overrides  | `app/api/debug/overrides/route.ts`        | GET    | List all active overrides               |
| Debug integrity  | `app/api/debug/integrity/route.ts`        | GET    | Integrity + exclusion status            |

### Where Applied

| Layer              | Path                          | Line(s)  | Description                                                |
| ------------------ | ----------------------------- | -------- | ---------------------------------------------------------- |
| Deals query filter | `app/api/deals/dealsQuery.ts` | 26, 166+ | Imports and applies `shouldExcludeListingFromCardSurfaces` |
| Top deals page     | `app/top-deals/page.tsx`      | varies   | Filters excluded listings                                  |
| Ending soon page   | `app/ending-soon/page.tsx`    | varies   | Filters excluded listings                                  |
| Card detail page   | `app/cards/[cardId]/page.tsx` | varies   | Filters excluded listings                                  |
| Set page           | `app/sets/[setId]/page.tsx`   | varies   | Filters excluded listings                                  |
| Debug exclusions   | `app/debug/exclusions/`       | varies   | Shows exclusion status + overrides                         |

---

## 2) Locked Invariants (Candidates)

### L1: Override Precedence Order

- **Order**: ALLOW override → HARD_BLOCK override → SOFT_EXCLUDE override → hard rules → soft rules
- **Why**: Database overrides are manual operator intervention; must supersede all automated rules
- **Evidence**: `lib/blacklist.ts:856-943`

### L2: Override Cache TTL

- **TTL**: 60 seconds
- **Why**: Balance between DB load reduction and override responsiveness
- **Evidence**: `lib/blacklist.ts:29`

### L3: Soft Exclusion vs Hard Block Distinction

- **Hard block**: Fake/scam items (replica, proxy, metal, counterfeit) — removed from DB possible
- **Soft exclusion**: Non-card merchandise (blanket, plush, playmat) — hidden only, NOT deleted
- **Why**: Soft exclusions are category leakage, not malicious; may still be useful in other contexts
- **Evidence**: `lib/blacklist.ts:302-306`

### L4: BANNED_TITLE_KEYWORDS is Source of Truth

- **Location**: `lib/ebay.ts:61-110+`
- **Why**: Single source for ingestion-time + query-time filtering
- **Usage**: Both `findBannedTitleKeyword()` (ingestion) and `getBlacklistReason()` (query) use it
- **Evidence**: `lib/ebay.ts:418-426`, `lib/blacklist.ts:660-677`

### L5: Real Card Indicators Bypass

- **Indicators**: Set numbers (e.g., 215/203), VMAX, VSTAR, GX, EX, Full Art, Alt Art, grading
- **Why**: Prevents false positives on legitimate cards that mention blocked terms in context
- **Evidence**: `lib/blacklist.ts:422-439`, `lib/blacklist.ts:1149-1221`

### L6: Batch Function Parity

- **Contract**: `shouldExcludeListingsBatch()` must return identical results to individual `shouldExcludeListingFromCardSurfaces()` calls
- **Why**: Performance optimization must not change filtering behavior
- **Evidence**: `lib/__tests__/integration/softExclusion.test.ts:284-337`

---

## 3) Known Risk Points

### R1: BANNED_TITLE_KEYWORDS Dual Location

- **Path**: `lib/ebay.ts:61-110+` (primary) + `lib/blacklist.ts:114` (re-export)
- **Issue**: Developers might add keywords to wrong file or miss the re-export
- **Impact**: Low (re-export ensures single source)
- **Severity**: Low

### R2: Allowlist Exceptions Are Pattern-Based

- **Path**: `lib/blacklist.ts:1149-1221`
- **Issue**: `shouldAllowDespiteMatch()` uses substring matching which could allow edge cases
- **Impact**: False negatives (scam items not blocked) possible for crafted titles
- **Severity**: Low (requires intentional evasion)

### R3: Override Cache Staleness Window

- **Path**: `lib/blacklist.ts:27-29`
- **Issue**: 60-second cache means new overrides take up to 60s to apply
- **Impact**: Operator creates override, user sees un-overridden result briefly
- **Severity**: Low (acceptable latency for admin action)

### R4: No Unit Tests for getBlacklistReason()

- **Path**: `lib/blacklist.ts:647-729`
- **Issue**: No dedicated unit tests; only integration tests exist
- **Impact**: Could silently break on refactor
- **Severity**: Medium

### R5: Soft Exclusion Keywords Growing List

- **Path**: `lib/blacklist.ts:313-387`
- **Issue**: 70+ keywords; no programmatic dedup or overlap check
- **Impact**: Maintenance burden; potential false positives from overly broad terms
- **Severity**: Low

### R6: Hide Listing Deletes from DB

- **Path**: `app/api/admin/hide-listing/route.ts:70-75`
- **Issue**: Uses DELETE (not soft delete); listing is permanently removed
- **Impact**: No undo possible; must re-ingest if mistake
- **Severity**: Medium (intentional but destructive)

### R7: Allow-Listing Only for Mismatch Reasons

- **Path**: `app/api/admin/allow-listing/route.ts:6-9`
- **Issue**: ALLOWED_REASONS hardcoded to `language_mismatch` and `collector_number_mismatch` only
- **Impact**: Cannot create ALLOW overrides for other reasons via this endpoint
- **Severity**: Low (other reasons can be added via direct DB if needed)

---

## 4) Hardening Opportunities

### MUST (Required for correctness)

None identified — current implementation is correct per SSOT.

### SHOULD (Recommended hardening)

| ID  | Description                                        | Path              | Effort |
| --- | -------------------------------------------------- | ----------------- | ------ |
| S1  | Add unit tests for `getBlacklistReason()`          | New test file     | Small  |
| S2  | Add unit tests for `getSoftExclusionReason()`      | New test file     | Small  |
| S3  | Add unit tests for `normalizeListingText()`        | New test file     | Tiny   |
| S4  | Document hide-listing destructive behavior in SSOT | `PROJECT_SSOT.md` | Tiny   |

### LATER (Requires refactor — PAUSED during rebaseline)

| ID  | Description                                         | Path                                   | Notes          |
| --- | --------------------------------------------------- | -------------------------------------- | -------------- |
| L1  | Soft-delete for hide-listing instead of hard DELETE | `app/api/admin/hide-listing/route.ts`  | Schema change  |
| L2  | Programmatic keyword dedup/overlap check            | `lib/blacklist.ts`                     | Low priority   |
| L3  | Extend ALLOWED_REASONS for broader override support | `app/api/admin/allow-listing/route.ts` | Feature change |

---

## 5) Test Coverage Gaps

### Gap 1: getBlacklistReason() Unit Tests (Priority: HIGH)

**What to test**:

- BANNED_TITLE_KEYWORDS matching
- ALL_DENYLIST_KEYWORDS fallback matching
- Short keyword word-boundary matching
- Allowlist exception bypass (graded cards, alt art)
- Variant contradiction integration

**Where**: `lib/__tests__/unit/blacklist.test.ts` (new file)

### Gap 2: getSoftExclusionReason() Unit Tests (Priority: MEDIUM)

**What to test**:

- Merchandise keyword detection (blanket, plush, hoodie, etc)
- Category name inclusion in search text
- False positive protection (cards with "hat", "figure" in context)
- Empty title handling

**Where**: `lib/__tests__/unit/blacklist.test.ts` (new file)

### Gap 3: normalizeListingText() Unit Tests (Priority: MEDIUM)

**What to test**:

- Lowercase conversion
- Diacritics normalization (NFD)
- Punctuation replacement
- Whitespace collapsing
- Title + subtitle combination

**Where**: `lib/__tests__/unit/blacklist.test.ts` (new file)

### Gap 4: Override Precedence (Priority: MEDIUM)

**What to test**:

- ALLOW override bypasses hard block rules
- ALLOW override bypasses soft exclusion rules
- HARD_BLOCK override takes precedence over soft exclusion
- Expired overrides are ignored

**Where**: Extend `lib/__tests__/integration/softExclusion.test.ts` or new file

### Existing Coverage (Good)

- `lib/__tests__/integration/softExclusion.test.ts` — 42 tests for soft exclusion, batch parity
- `lib/__tests__/integration/variantContradiction.test.ts` — 12 tests for variant contradiction

---

## 6) SSOT Reconciliation

**SSOT states** (PROJECT_SSOT.md "Listing Exclusion (Admin)"):

> "Single-listing exclusions live in `listing_overrides` (`override_type = HARD_BLOCK`) and are managed via `/admin/listings`. Excluded listings never surface on public pages (enforced in `shouldExcludeListingFromCardSurfaces` used by deals queries + page filters)."

**Code implements**:

- ✅ Overrides stored in `listing_overrides` table — matches
- ✅ `shouldExcludeListingFromCardSurfaces()` checks overrides first — matches
- ✅ Deals query uses this function to filter — matches (`app/api/deals/dealsQuery.ts:166`)

**SSOT states** (PROJECT_SSOT.md "Batched Exclusion Checks"):

> "For batch operations, use `shouldExcludeListingsBatch()` which fetches all overrides in ONE query (or cache hit) then evaluates synchronously."

**Code implements**:

- ✅ `shouldExcludeListingsBatch()` exists — matches (`lib/blacklist.ts:995-1032`)
- ✅ Uses `getOverridesForListings()` for batch fetch — matches
- ✅ Parity tested — matches (`lib/__tests__/integration/softExclusion.test.ts:284-337`)

**Discrepancy**: None found. Code matches SSOT.

---

## 7) Deferred Items

- L1, L2, L3 from Hardening Opportunities are deferred until rebaseline completes
- R6 (hide-listing destructive) is intentional behavior; could add soft-delete later

---

## 8) PR A Review Applied

- **PR #136**: Docs-only review of blacklist + overrides implementation. Path map, locked invariants, risk findings, and test coverage gaps documented.

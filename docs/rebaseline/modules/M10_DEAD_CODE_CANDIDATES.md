# M10: Dead Code Candidates Review

**Module**: M10 — Dead Code Candidates
**Status**: REVIEW COMPLETE
**Date**: 2025-12-31

---

## 1) Inventory

### Summary

| Category           | Count | Decision |
| ------------------ | ----- | -------- |
| Disabled lib files | 1     | KEEP     |
| Unused packages    | 2     | DEFER    |
| Redundant packages | 1     | DEFER    |
| One-off scripts    | 34    | KEEP     |
| Ad-hoc scripts     | ~45   | KEEP     |

---

## 2) Dead Code Candidates

### DC1: `lib/ebayStorefront.ts` — KEEP (Dormant)

**Status**: Dormant (disabled via flag), not dead

**Evidence**:

```
$ rg "SHOPPING_API_DISABLED" lib/
lib/ebayStorefront.ts:26:const SHOPPING_API_DISABLED = true;
lib/ebayStorefront.ts:126:  if (SHOPPING_API_DISABLED) {
```

**Imports**: Still imported by 4 files:

- `scripts/update-listings.ts:31`
- `scripts/backfill-seller-store-names.ts:16`
- `scripts/enrich-single-listing.ts:9`
- (also referenced in archived docs)

**Behavior**:

- The `SHOPPING_API_DISABLED = true` flag makes all API calls return `null`
- Manual seller overrides still work (e.g., `andre17 → "brazil shop"`)
- File is **not dead code** — it provides override functionality and guards against accidental API calls

**Decision**: **KEEP** — File serves as:

1. Documentation of why Shopping API was disabled (rate limits)
2. Manual seller override registry that still works
3. Toggle point if eBay rate limits improve in future
4. Import site for `extractItemId()` utility

**Risk of removal**: Would break 4 import sites, lose override functionality.

---

### DC2: `cheerio` package — DEFER

**Status**: Candidate for removal

**Evidence**:

```
$ rg "cheerio" package.json
"cheerio": "^1.1.2",

$ rg "from ['\"]cheerio|import.*cheerio|require.*cheerio" --type ts
(no matches in .ts files)
```

**Finding**: The `cheerio` package is declared in `package.json` but **never imported** in any TypeScript file.

**History**: Was likely used by `ebayStorefront.ts` for HTML parsing before the Shopping API was disabled. When the API was disabled, the cheerio import was removed but the package wasn't cleaned up.

**Decision**: **DEFER** — Not blocking; can be removed in a dependency hygiene pass. Removal is safe but not urgent.

**Evidence for future removal**:

```bash
npm uninstall cheerio  # Safe — no imports
```

---

### DC3: `@types/dotenv` package — DEFER

**Status**: Candidate for removal

**Evidence**:

```
$ rg "@types/dotenv" package.json
"@types/dotenv": "^8.2.3",
```

**Finding**: Modern `dotenv` (v16+) includes its own TypeScript types. The separate `@types/dotenv` package is redundant.

**Current dotenv version**: `"dotenv": "^17.2.3"` — includes types

**Decision**: **DEFER** — Not blocking; can be removed in a dependency hygiene pass.

**Evidence for future removal**:

```bash
npm uninstall @types/dotenv  # Safe — dotenv includes types
```

---

### DC4: `ts-node` package — KEEP

**Status**: Active (used by npm script)

**Evidence**:

```
$ rg "ts-node" package.json
"sold:update": "ts-node --esm scripts/update-sold-listings.ts",
"ts-node": "^10.9.2",
```

**Finding**: Initially appeared redundant with `tsx`, but `ts-node` is **actively used** by the `sold:update` npm script.

**Decision**: **KEEP** — Script depends on it. Could migrate to `tsx` in future but not dead code.

---

### DC5: One-off scripts (`scripts/one-off/`) — KEEP

**Status**: Historical archive

**Evidence**:

```
$ ls scripts/one-off/*.ts | wc -l
34
```

**Contents**: 34 TypeScript files including:

- `check-*.ts` (13 files) — Database verification
- `test-*.ts` (11 files) — One-time API tests
- `verify-*.ts`, `final-*.ts` — Release verification
- Migration helpers (`run-migration.ts`, `add-pokemontcg-cols.ts`)

**Finding**: These scripts are clearly marked as historical in `scripts/one-off/README.md`:

> "Historical debug, verification, and migration scripts used during development."
> "These scripts are **not production tools**."

**Decision**: **KEEP** — Already properly isolated in `one-off/` directory with README explaining status. No action needed.

---

### DC6: Ad-hoc scripts in `scripts/` — KEEP

**Status**: Mixed (some production, some ad-hoc)

**Evidence**: 65 total TypeScript files in `scripts/`, of which:

- **Production scripts** (in package.json): 14 scripts
- **Ad-hoc scripts** (not in package.json): ~51 scripts

**Examples of ad-hoc scripts**:

- `audit-seller-data.ts` — One-time audit
- `check-*.ts` (16 files) — Various checks
- `test-*.ts` (12 files) — Various tests
- `verify-*.ts` (6 files) — Verification scripts

**Decision**: **KEEP** — These are useful for debugging and development. They don't affect production and don't bloat the runtime bundle.

**Future consideration**: Could move more scripts to `scripts/one-off/` for cleaner organization, but not urgent.

---

## 3) Risk Analysis

| ID  | Candidate           | Risk if Removed | Recommendation |
| --- | ------------------- | --------------- | -------------- |
| DC1 | `ebayStorefront.ts` | HIGH            | KEEP           |
| DC2 | `cheerio`           | LOW             | DEFER          |
| DC3 | `@types/dotenv`     | LOW             | DEFER          |
| DC4 | `ts-node`           | HIGH            | KEEP           |
| DC5 | `scripts/one-off/`  | LOW             | KEEP           |
| DC6 | Ad-hoc scripts      | LOW             | KEEP           |

---

## 4) Hardening Opportunities

### MUST (Required)

None — no broken imports or runtime failures found.

### SHOULD (Recommended)

| ID  | Description                              | Files          | Effort |
| --- | ---------------------------------------- | -------------- | ------ |
| S1  | Remove unused `cheerio` package          | `package.json` | Tiny   |
| S2  | Remove redundant `@types/dotenv` package | `package.json` | Tiny   |

### LATER (Deferred)

| ID  | Description                                    | Notes                         |
| --- | ---------------------------------------------- | ----------------------------- |
| L1  | Migrate `sold:update` from ts-node to tsx      | Low priority; both work       |
| L2  | Move more ad-hoc scripts to `scripts/one-off/` | Organization only; not urgent |

---

## 5) Acceptance Criteria

- [x] Dead code candidates inventoried with ripgrep evidence
- [x] Import chains verified for each candidate
- [x] lib/ files checked for unused exports
- [x] package.json dependencies checked for unused packages
- [x] scripts/ directory analyzed for dead scripts
- [x] components/ directory analyzed for unused components (none found)
- [x] Each candidate has KEEP/DEFER/REMOVE decision with rationale

---

## 6) Hardening Decision

**Assessment**: The dead code candidate review found:

- 1 dormant but functional file (`ebayStorefront.ts`) — KEEP
- 2 unused packages (`cheerio`, `@types/dotenv`) — DEFER for dependency hygiene
- 1 initially-suspect but actually-used package (`ts-node`) — KEEP
- 34+ ad-hoc scripts — KEEP (properly isolated)

**Decision**: **NO CODE CHANGES** in this PR.

The two package removals (S1, S2) are:

- Safe and low-risk
- But should be done in a dedicated "dependency hygiene" PR, not bundled with docs
- Deferred to future work (can be tracked in WORKSTREAMS_MASTER.md)

This M10 module is **docs-only** — inventory and decisions documented, no deletions.

---

## 7) PR(s)

_Docs-only PR to be opened after this document is complete._

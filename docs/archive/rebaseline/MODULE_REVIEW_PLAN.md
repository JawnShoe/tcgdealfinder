# REBASELINE v1 — Module Review Plan

**Created**: 2025-12-29
**Purpose**: Define module review order and acceptance criteria for rebaseline.

---

## Guiding Principles

1. **Small PRs only** — No mega-PR refactors. Each module review produces 1-3 focused PRs.
2. **Docs-first** — Each module review starts with a docs-only PR documenting findings.
3. **No feature work** — Rebaseline is inventory/hardening/governance only.
4. **Every rule has**: scope + unlock path + acceptance criteria.

---

## Review Order

Modules are ordered by criticality and dependency chain.

| Phase | Module                  | Priority | Reason                                   |
| ----- | ----------------------- | -------- | ---------------------------------------- |
| 1     | `lib/` (core)           | HIGH     | Foundation for all other modules         |
| 2     | `app/api/` (API routes) | HIGH     | Data layer; affects all pages            |
| 3     | `components/` (UI)      | HIGH     | User-facing; highest bloat risk          |
| 4     | `app/` (pages)          | MEDIUM   | Uses lib + components; review after deps |
| 5     | `scripts/` (pipelines)  | MEDIUM   | Data freshness; runs unattended          |
| 6     | `migrations/`           | MEDIUM   | Schema changes; verify all applied       |
| 7     | `.github/workflows/`    | MEDIUM   | CI/CD; verify all workflows functional   |
| 8     | `docs/`                 | LOW      | Supporting; archive stale docs           |
| 9     | Dead code candidates    | LOW      | Verify and remove                        |

---

## Module Review Template

Each module review follows this template:

### 1. Inventory PR (docs-only)

- List all files in module
- Classify each file: production-critical / supporting / historical / dead (candidate)
- Note any risks or bloat candidates

### 2. Hardening PR(s) (code changes)

- Fix any issues found during inventory
- Remove dead code (after verification)
- Refactor bloat (if small, focused change)

### 3. Acceptance Criteria

- [ ] All files inventoried
- [ ] Risks documented
- [ ] Dead code candidates verified
- [ ] Bloat candidates noted (not necessarily fixed)
- [ ] Tests pass
- [ ] Lint pass
- [ ] Build pass

---

## Phase 1: `lib/` Core

### Scope

All files in `lib/` except `lib/__tests__/`.

### Files to Review

| File                          | Expected Classification |
| ----------------------------- | ----------------------- |
| lib/db.ts                     | Production-critical     |
| lib/ebay.ts                   | Production-critical     |
| lib/ebayStorefront.ts         | Dead (candidate)        |
| lib/adminAuth.ts              | Production-critical     |
| lib/debugAuth.ts              | Supporting              |
| lib/blacklist.ts              | Production-critical     |
| lib/dealScore.ts              | Production-critical     |
| lib/dealConfidence.ts         | Production-critical     |
| lib/dealFormatting.ts         | Production-critical     |
| lib/dealMath.ts               | Production-critical     |
| lib/dealSort.ts               | Production-critical     |
| lib/dealViewModel.ts          | Production-critical     |
| lib/fxRates.ts                | Production-critical     |
| lib/markets.ts                | Production-critical     |
| lib/money.ts                  | Production-critical     |
| lib/pricing.ts                | Production-critical     |
| lib/schema.ts                 | Production-critical     |
| lib/typography.ts             | Production-critical     |
| lib/tableColumns.tsx          | Production-critical     |
| lib/tableColumnConfig.ts      | Production-critical     |
| lib/whyDeal.ts                | Production-critical     |
| lib/affiliateUrl.ts           | Production-critical     |
| lib/alertsConfig.ts           | Production-critical     |
| lib/anonId.ts                 | Production-critical     |
| lib/baselineUsd.ts            | Production-critical     |
| lib/cards.ts                  | Production-critical     |
| lib/collectorNumber.ts        | Production-critical     |
| lib/dateFormatting.ts         | Production-critical     |
| lib/dealsState.ts             | Production-critical     |
| lib/dealsStateStorage.ts      | Production-critical     |
| lib/emailQueue.ts             | Production-critical     |
| lib/emailSubscriptions.ts     | Production-critical     |
| lib/filters.ts                | Production-critical     |
| lib/language.ts               | Production-critical     |
| lib/marketPreference.ts       | Production-critical     |
| lib/marketPreferenceClient.ts | Production-critical     |
| lib/rateLimit.ts              | Production-critical     |
| lib/rateLimitRetry.ts         | Production-critical     |
| lib/sellerDisplay.ts          | Production-critical     |
| lib/stockImages.ts            | Production-critical     |
| lib/tcgplayerClient.ts        | Production-critical     |
| lib/useWatchlist.ts           | Production-critical     |
| lib/watchlistDb.ts            | Production-critical     |
| lib/watchlistEnrichment.ts    | Production-critical     |
| lib/watchlistStorage.ts       | Production-critical     |

### Acceptance Criteria (Phase 1)

- [ ] All lib files inventoried
- [ ] ebayStorefront.ts verified as dead code
- [ ] No circular dependencies
- [ ] All exports used (no dead exports)
- [ ] Tests pass for lib/**tests**/

---

## Phase 2: `app/api/` API Routes

### Scope

All files in `app/api/`.

### Acceptance Criteria (Phase 2)

- [ ] All API routes inventoried
- [ ] Each route documented (method, auth, purpose)
- [ ] Rate limiting verified where applicable
- [ ] Error handling consistent
- [ ] No SQL injection risks

---

## Phase 3: `components/` UI

### Scope

All files in `components/`.

### Known Risks

- `CardDetailClient.tsx` (65 KB) — Bloat candidate
- `DealsTable.tsx` (63 KB) — Bloat candidate

### Acceptance Criteria (Phase 3)

- [ ] All components inventoried
- [ ] Bloat candidates documented
- [ ] Tooltip patterns consistent (see VISUAL_CONTRACT.md)
- [ ] No inline styles (Tailwind only)
- [ ] Accessibility attributes present

---

## Phase 4-9: Remaining Modules

Each phase follows the same template:

1. Inventory PR (docs-only)
2. Hardening PR(s) (code changes)
3. Acceptance criteria verification

---

## Completion Criteria

Rebaseline v1 is complete when:

- [ ] All 9 phases completed
- [ ] All dead code candidates verified and removed (or documented as kept)
- [ ] All bloat candidates documented (refactoring deferred to Tier 2)
- [ ] All risks documented in REPO_PACKET
- [ ] SSOT updated to mark REBASELINE as complete
- [ ] Tier 2 workstream un-paused

---

## PR Naming Convention

```
docs/rebaseline-phase{N}-{module}-inventory
fix/rebaseline-phase{N}-{module}-{issue}
```

Examples:

- `docs/rebaseline-phase1-lib-inventory`
- `fix/rebaseline-phase1-lib-remove-dead-exports`
- `docs/rebaseline-phase3-components-inventory`

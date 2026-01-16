# Legacy Quarantine

Single source of truth for legacy code isolation.

## Rebuild Isolation Boundary (LOCKED)

**Hard rule**: Files under `app/rebuild/**` and `lib/rebuild/**` must NEVER import from `legacy/**`.

Enforcement:

1. **ESLint**: `no-restricted-imports` blocks legacy imports globally
2. **CI boundary check**: `grep`-based check fails if any rebuild file imports from legacy

## Archive Structure

All legacy files are now archived under `legacy/archive/<domain>/` with header comments.

### Trust (archived)

- `legacy/archive/trust/components/FeaturedDealsStrip.tsx`
- `legacy/archive/trust/components/home/HomeContentSafe.tsx`
- `legacy/archive/trust/lib/tableColumnConfig.ts`

### Search (archived)

- `legacy/archive/search/components/SearchAutocomplete.tsx`

### Watchlist (archived)

- `legacy/archive/watchlist/components/WatchlistButton.tsx`
- `legacy/archive/watchlist/lib/useWatchlist.ts`

### State (archived)

- `legacy/archive/state/lib/dealsState.ts`
- `legacy/archive/state/lib/dealsStateStorage.ts`

### Currency (archived)

- `legacy/archive/currency/hooks/useViewerCurrency.ts`

## Script-Only Lib Files

These are NOT quarantine candidates — used by scripts but not app routes:

| File                     | Used by                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `lib/baselineUsd.ts`     | `scripts/update-historical-prices.ts`                                  |
| `lib/collectorNumber.ts` | `scripts/backfill-collector-numbers.ts`, `scripts/update-listings.ts`  |
| `lib/ebayStorefront.ts`  | `scripts/update-listings.ts`, `scripts/backfill-seller-store-names.ts` |
| `lib/emailQueue.ts`      | `scripts/check-alerts.ts`                                              |
| `lib/fxRates.ts`         | `scripts/update-fx-rates.ts`, `scripts/update-listings.ts`             |
| `lib/language.ts`        | `scripts/backfill-card-language.ts`                                    |
| `lib/tcgplayerClient.ts` | `scripts/import-tcgplayer-catalog.ts`                                  |

## Audit Commands

```bash
# Find files with zero imports
npx madge --extensions ts,tsx --ts-config tsconfig.json --json app/ components/ lib/

# Verify no legacy imports in rebuild surfaces
grep -rE "from ['\"].*legacy|import.*from ['\"].*legacy" app/rebuild lib/rebuild

# Verify build passes
npm run build
```

## Decommission Stages

**Prerequisite**: Boundary must remain clean (0 legacy→rebuild imports, 0 rebuild→legacy imports).

**Stage 0: Governance + kill list**

- Ratify decommission program (ADR-0019 + Legacy Decommission Contract in CONTRACTS.md)
- Define Upgrade Ledger template
- Lock Decommission Gates in RELEASE_CHECKLIST.md
- Status: COMPLETE (this PR)

**Stage 1: Visitor surfaces migrate**

- Scope: User-facing routes and components not yet migrated to rebuild
- Examples: `/newest`, `/top-deals`, `/ending-soon`, `/search` (if not yet redirected)
- Requirement: Rebuild parity must exist and be tested
- Deliverable: Routes redirect to rebuild equivalents OR are deleted with justification

### Stage 1 Kill List (Visitor Surfaces)

| Legacy Route          | Current Status      | Disposition         | Rebuild Target                     | Parity Criteria                                                                                                         | VISUAL_CONTRACT | Evidence Hook |
| --------------------- | ------------------- | ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------- | ------------- |
| `/`                   | Redirected          | Replace in rebuild  | `/rebuild`                         | Root entrypoint ownership; SSR-stable trust surfaces; compliance disclosure                                             | Yes             | PR #262       |
| `/top-deals`          | Redirected          | Redirect to rebuild | `/discovery?sort=biggest-discount` | Discovery route exists; sort/filter parity; trust moat present; synthetics cover journey                                | Yes             | PR #315       |
| `/newest`             | Redirected          | Redirect to rebuild | `/discovery`                       | Discovery route exists; sort=newest preset; trust moat present; synthetics cover journey                                | Yes             | PR #316       |
| `/ending-soon`        | Redirected          | Redirect to rebuild | `/discovery`                       | Discovery route exists; sort=endingSoon preset; trust moat present; synthetics cover journey                            | Yes             | PR #318       |
| `/search`             | Redirected          | Redirect to rebuild | `/rebuild/discovery`               | Discovery route exists; query param support; trust moat present; synthetics cover journey                               | Yes             | PR #321       |
| `/alerts`             | Redirected          | Redirect to rebuild | `/rebuild/alerts`                  | Alerts shell exists; alert evaluation API exists; SSR-visible compliance disclosure                                     | Yes             | PR #322       |
| `/alerts/unsubscribe` | Active (API ported) | PORT (API-first)    | `/api/rebuild/alerts/unsubscribe`  | API ported (PR #323); page route deferred (low traffic, emails use API); page still legacy                              | N/A (API only)  | PR #323       |
| `/watchlist`          | Retired             | RETIRED             | `/rebuild/discovery`               | Watchlist retired pre-launch; no rebuild watchlist; route redirects; UI entrypoints (header link, star buttons) removed | N/A             | PR #324       |
| `/cards/[cardId]`     | Redirected          | Redirect to rebuild | `/rebuild/listing/[id]`            | Listing detail exists; cardId→listingId mapping deterministic; trust panel + confidence + provenance SSR                | Yes             | PR #325       |
| `/sets`               | Redirected          | Redirect to rebuild | `/rebuild/discovery`               | Discovery route exists; set filter parity; trust moat present                                                           | Yes             | PR #326       |
| `/sets/[setId]`       | Redirected          | Redirect to rebuild | `/rebuild/discovery`               | Discovery route exists; trust moat present; NOTE: set filter not supported (degraded parity)                            | Yes             | PR #327       |
| `/catalog`            | Retired             | Retire              | N/A                                | Catalog route is low-traffic utility; rebuild does not require catalog UI                                               | N/A             | PR #328       |
| `/catalog/sets/[...]` | Retired             | Retire              | N/A                                | Catalog route is low-traffic utility; rebuild does not require catalog UI                                               | N/A             | PR #328       |

**Stage 2: Admin surfaces migrate**

- Scope: `/admin/**`, `/debug/**` routes and components
- Requirement: Rebuild ops dashboard must provide equivalent functionality OR admin routes are documented as deprecated
- Deliverable: Admin routes either migrated or explicitly deprecated with runbook

**Stage 3: Pipelines/scripts migrate**

- Scope: Scripts that import from legacy lib files (see Script-Only Lib Files above)
- Requirement: Rebuild equivalents exist in `lib/rebuild/**` OR scripts are refactored to use rebuild data access patterns
- Deliverable: Zero legacy lib imports from scripts

**Stage 4: Delete legacy**

- Scope: Remove `legacy/**`, `app/cards/**`, `app/sets/**`, and any remaining non-rebuild runtime code
- Requirement: All prior stages complete, boundary clean, CI green, E2E passing
- Deliverable: Legacy namespace removed from repo

## Rules

1. Moves only — no edits to quarantined files
2. `/legacy/**` is reference-only — no imports allowed
3. Each quarantine expansion requires evidence audit + green build

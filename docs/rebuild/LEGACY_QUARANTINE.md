# Legacy Quarantine

Single source of truth for legacy code isolation.

## Rebuild Isolation Boundary (LOCKED)

**Hard rule**: Files under `app/rebuild/**` and `lib/rebuild/**` must NEVER import from `legacy/**`.

Enforcement:

1. **ESLint**: `no-restricted-imports` blocks legacy imports globally
2. **CI boundary check**: `grep`-based check fails if any rebuild file imports from legacy

## Quarantine Allowlist

Files moved to `legacy/` — zero imports from active surfaces.

### Components

- `legacy/components/FeaturedDealsStrip.tsx`
- `legacy/components/home/HomeContentSafe.tsx`
- `legacy/components/SearchAutocomplete.tsx`
- `legacy/components/WatchlistButton.tsx`

### Lib

- `legacy/lib/dealsState.ts` — state types (dependency of dealsStateStorage only)
- `legacy/lib/dealsStateStorage.ts` — localStorage persistence (superseded)
- `legacy/lib/tableColumnConfig.ts` — replaced by `lib/tableColumns.tsx`
- `legacy/lib/useWatchlist.ts` — replaced by `lib/WatchlistContext.tsx`

### Hooks

- `legacy/hooks/useViewerCurrency.ts` — completely unused

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

## Rules

1. Moves only — no edits to quarantined files
2. `/legacy/**` is reference-only — no imports allowed
3. Each quarantine expansion requires evidence audit + green build

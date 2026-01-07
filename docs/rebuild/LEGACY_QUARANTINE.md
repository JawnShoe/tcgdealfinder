# Legacy Quarantine (v3)

Purpose:
Quarantine pre-rebuild implementation files that are provably unused by active surfaces, while keeping the build green.

Scope (Bucket A only):
Move files that have no import references in the repo and are not part of the rebuild lane.

## Rebuild Isolation Boundary (LOCKED)

**Hard rule**: Files under `app/rebuild/**` and `lib/rebuild/**` must NEVER import from `legacy/**`.

Enforcement:

1. **ESLint**: `no-restricted-imports` rule blocks legacy imports globally, with stricter messaging for rebuild surfaces
2. **CI boundary check**: `grep`-based check in CI fails if any rebuild file imports from legacy

## Bucket A allowlist (v3)

### Components (v1)

- components/FeaturedDealsStrip.tsx
- components/home/HomeContentSafe.tsx
- components/SearchAutocomplete.tsx
- components/WatchlistButton.tsx

### Lib utilities (v2)

- lib/dealsStateStorage.ts — localStorage persistence for deals view state (superseded)
- lib/tableColumnConfig.ts — column configuration system (replaced by lib/tableColumns.tsx)
- lib/useWatchlist.ts — legacy watchlist hook using external store pattern (replaced by lib/WatchlistContext.tsx)

### Lib + hooks (v3 expansion)

- lib/dealsState.ts — deals view state types (only imported by legacy/lib/dealsStateStorage.ts)
- hooks/useViewerCurrency.ts — viewer currency detection hook (completely unused)

## Audit evidence (v3)

Each file was verified with:

1. `grep -r "from.*<filename>|import.*<filename>" app components lib scripts --include="*.ts" --include="*.tsx"` → 0 code imports from active surfaces
2. Confirmed NOT a Next.js route entrypoint (page.tsx, layout.tsx, route.ts)
3. `npm run build` → PASS after move

### lib/dealsState.ts (v3)

- Exports: `DealsViewState`, `DEFAULT_DEALS_VIEW_STATE`, sort/filter validation functions
- Import search: only imported by `legacy/lib/dealsStateStorage.ts` (itself in legacy)
- Status: dependency of legacy code only

### hooks/useViewerCurrency.ts (v3)

- Exports: `useViewerCurrency()`, `shouldShowUsdApprox()`
- Import search: `grep -r "useViewerCurrency" **/*.{ts,tsx}` → 0 imports anywhere
- Status: completely unused (was scaffolded but never integrated)

### lib/dealsStateStorage.ts (v2)

- Exports: `loadDealsViewState()`, `saveDealsViewState()`
- Import search: `grep -r "dealsStateStorage" **/*.{ts,tsx}` → 0 code imports (only doc references)
- Status: superseded by other state management

### lib/tableColumnConfig.ts (v2)

- Exports: `ColumnKey`, `TableVariant`, `ColumnDefinition`, `DEFAULT_LAYOUT`, `getColumnDefinition()`, `getColumnClasses()`, `getColumnTextAlignment()`, `getVariantColumnKeys()`
- Import search: `grep -r "tableColumnConfig|getColumnDefinition|getColumnClasses" **/*.{ts,tsx}` → 0 code imports (only doc references)
- Status: replaced by lib/tableColumns.tsx

### lib/useWatchlist.ts (v2)

- Exports: `useWatchlist()`, `WatchlistEntry`, `isCardWatched()`, `toggleWatchlistEntry()`, `removeWatchlistEntry()`
- Import search: `grep -r "from.*useWatchlist[^C]" **/*.{ts,tsx}` → 0 code imports (only comment reference)
- Status: replaced by lib/WatchlistContext.tsx (context-based approach)

## Rules

- Moves only. No edits to quarantined files.
- /legacy/\*\* is reference-only. No imports from legacy paths.
- Rebuild surfaces (app/rebuild/\*\*, lib/rebuild/\*\*) must NEVER import from legacy — enforced by ESLint + CI.
- Each quarantine expansion must include an evidence audit and keep npm run build passing.

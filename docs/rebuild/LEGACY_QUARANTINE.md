# Legacy Quarantine (v2)

Purpose:
Quarantine pre-rebuild implementation files that are provably unused by active surfaces, while keeping the build green.

Scope (Bucket A only):
Move files that have no import references in the repo and are not part of the rebuild lane.

## Bucket A allowlist (v2)

### Components (v1)

- components/FeaturedDealsStrip.tsx
- components/home/HomeContentSafe.tsx
- components/SearchAutocomplete.tsx
- components/WatchlistButton.tsx

### Lib utilities (v2 expansion)

- lib/dealsStateStorage.ts — localStorage persistence for deals view state (superseded)
- lib/tableColumnConfig.ts — column configuration system (replaced by lib/tableColumns.tsx)
- lib/useWatchlist.ts — legacy watchlist hook using external store pattern (replaced by lib/WatchlistContext.tsx)

## Audit evidence (v2)

Each file was verified with:

1. `grep -r "from.*<filename>|import.*<filename>" app components lib scripts --include="*.ts" --include="*.tsx"` → 0 code imports
2. Confirmed NOT a Next.js route entrypoint (page.tsx, layout.tsx, route.ts)
3. `npm run build` → PASS after move

### lib/dealsStateStorage.ts

- Exports: `loadDealsViewState()`, `saveDealsViewState()`
- Import search: `grep -r "dealsStateStorage" **/*.{ts,tsx}` → 0 code imports (only doc references in MODULE_REVIEW_PLAN.md)
- Status: superseded by other state management

### lib/tableColumnConfig.ts

- Exports: `ColumnKey`, `TableVariant`, `ColumnDefinition`, `DEFAULT_LAYOUT`, `getColumnDefinition()`, `getColumnClasses()`, `getColumnTextAlignment()`, `getVariantColumnKeys()`
- Import search: `grep -r "tableColumnConfig|getColumnDefinition|getColumnClasses" **/*.{ts,tsx}` → 0 code imports (only doc references in archived docs)
- Status: replaced by lib/tableColumns.tsx

### lib/useWatchlist.ts

- Exports: `useWatchlist()`, `WatchlistEntry`, `isCardWatched()`, `toggleWatchlistEntry()`, `removeWatchlistEntry()`
- Import search: `grep -r "from.*useWatchlist[^C]" **/*.{ts,tsx}` → 0 code imports (only comment reference in watchlistStorage.ts and doc references)
- Status: replaced by lib/WatchlistContext.tsx (context-based approach)

## Rules

- Moves only. No edits to quarantined files.
- /legacy/\*\* is reference-only. No imports from legacy paths.
- Each quarantine expansion must include an evidence audit and keep npm run build passing.

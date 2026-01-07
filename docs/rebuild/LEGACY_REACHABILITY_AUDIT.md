# Legacy Reachability Audit (v4)

Generated: 2026-01-07T19:34:39.146Z

## Summary

| Metric                               | Count |
| ------------------------------------ | ----- |
| Total files analyzed                 | 151   |
| Next.js entrypoints                  | 48    |
| Files reachable from app entrypoints | 127   |
| lib/ files                           | 47    |
| components/ files                    | 32    |

## Tool & Methodology

- **Tool**: madge v8.0.0 + custom BFS reachability analysis
- **Command**: `npx madge --extensions ts,tsx --ts-config tsconfig.json --json app/ components/ lib/`
- **Entrypoints**: All `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `global-error.tsx` files in `app/`

## Bucket Definitions

| Bucket | Definition                                                   | Action                  |
| ------ | ------------------------------------------------------------ | ----------------------- |
| **A**  | Unreachable from app entrypoints, but MAY be used by scripts | Review for script usage |
| **B**  | Unreachable from BOTH app entrypoints AND scripts            | Quarantine candidates   |
| **C**  | Reachable only through deprecated/legacy paths               | Watch for removal       |

## Bucket A: Unreachable from App Entrypoints

### lib/ files (7)

These files are NOT imported by any app route but MAY be used by scripts:

- `lib/baselineUsd.ts`
- `lib/collectorNumber.ts`
- `lib/ebayStorefront.ts`
- `lib/emailQueue.ts`
- `lib/fxRates.ts`
- `lib/language.ts`
- `lib/tcgplayerClient.ts`

**Note**: All Bucket A lib files were verified to be used by scripts:

- `lib/baselineUsd.ts` — used by `scripts/update-historical-prices.ts`
- `lib/collectorNumber.ts` — used by `scripts/backfill-collector-numbers.ts`, `scripts/update-listings.ts`
- `lib/ebayStorefront.ts` — used by `scripts/update-listings.ts`, `scripts/backfill-seller-store-names.ts`
- `lib/emailQueue.ts` — used by `scripts/check-alerts.ts`
- `lib/fxRates.ts` — used by `scripts/update-fx-rates.ts`, `scripts/update-listings.ts`, etc.
- `lib/language.ts` — used by `scripts/backfill-card-language.ts`
- `lib/tcgplayerClient.ts` — used by `scripts/import-tcgplayer-catalog.ts`

### components/ files (0)

_None — all components are reachable from app entrypoints._

## Bucket B: Quarantine Candidates (Unreachable from App AND Scripts)

These files have ZERO imports from any entrypoint (app or script):

_Based on PR #247 and #248, these have already been quarantined:_

- `legacy/lib/dealsState.ts`
- `legacy/lib/dealsStateStorage.ts`
- `legacy/lib/tableColumnConfig.ts`
- `legacy/lib/useWatchlist.ts`
- `legacy/hooks/useViewerCurrency.ts`
- `legacy/components/FeaturedDealsStrip.tsx`
- `legacy/components/home/HomeContentSafe.tsx`
- `legacy/components/SearchAutocomplete.tsx`
- `legacy/components/WatchlistButton.tsx`

**No additional Bucket B candidates found in this audit.**

## Bucket C: Watch List (Legacy Dependency Paths)

Files that are reachable but through potentially deprecated paths:

_None identified in this audit._

## Next.js Entrypoints (48)

- `app/admin/alerts/page.tsx`
- `app/admin/blacklist/page.tsx`
- `app/admin/exclusions/page.tsx`
- `app/admin/listings/page.tsx`
- `app/admin/login/page.tsx`
- `app/admin/page.tsx`
- `app/alerts/page.tsx`
- `app/alerts/unsubscribe/page.tsx`
- `app/api/admin/alerts/create/route.ts`
- `app/api/admin/alerts/delete/route.ts`
- `app/api/admin/alerts/toggle/route.ts`
- `app/api/admin/allow-listing/route.ts`
- `app/api/admin/blacklist-seller/route.ts`
- `app/api/admin/hide-listing/route.ts`
- `app/api/admin/login/route.ts`
- `app/api/admin/revoke-allow/route.ts`
- `app/api/alerts/subscribe/route.ts`
- `app/api/alerts/unsubscribe/route.ts`
- `app/api/cards/[cardId]/other-markets/route.ts`
- `app/api/deals/route.ts`
- `app/api/debug/integrity/route.ts`
- `app/api/debug/overrides/route.ts`
- `app/api/health/route.ts`
- `app/api/historicals/[cardId]/route.ts`
- `app/api/listings/by-ebay-id/route.ts`
- `app/api/market/route.ts`
- `app/api/search-cards/route.ts`
- `app/api/watchlist-cards/route.ts`
- `app/api/watchlist/route.ts`
- `app/cards/[cardId]/page.tsx`
- `app/cards/layout.tsx`
- `app/catalog/page.tsx`
- `app/catalog/sets/[catalogSetId]/page.tsx`
- `app/debug/exclusions/page.tsx`
- `app/debug/login/route.ts`
- `app/debug/logout/route.ts`
- `app/ending-soon/page.tsx`
- `app/global-error.tsx`
- `app/layout.tsx`
- `app/newest/page.tsx`
- `app/page.tsx`
- `app/rebuild/listing/[id]/loading.tsx`
- `app/rebuild/listing/[id]/page.tsx`
- `app/search/page.tsx`
- `app/sets/[setId]/page.tsx`
- `app/sets/page.tsx`
- `app/top-deals/page.tsx`
- `app/watchlist/page.tsx`

## Conclusion

The codebase is well-maintained with:

- **0 new quarantine candidates** (all unused files already in `legacy/`)
- **7 script-only lib files** (correctly categorized as backend utilities)
- **All components reachable** from app entrypoints

The legacy quarantine (v1-v3) has already captured all unreachable code.

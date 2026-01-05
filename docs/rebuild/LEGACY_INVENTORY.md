# Legacy Inventory

## Routes

- /
- /top-deals
- /newest
- /ending-soon
- /sets
- /sets/[setId]
- /cards/[cardId]
- /watchlist
- /catalog
- /catalog/sets/[catalogSetId]
- /alerts
- /alerts/unsubscribe
- /search
- /debug/exclusions
- /admin
- /admin/login
- /admin/blacklist
- /admin/listings
- /admin/alerts
- /admin/exclusions

## Core components

- components/DealsTable.tsx
- components/CardDetailClient.tsx
- components/FeaturedDeals.tsx
- components/FeaturedDealsStrip.tsx
- components/TopDealsClient.tsx
- components/EndingSoonClient.tsx
- components/WatchlistPageClient.tsx
- components/WatchlistPageApi.tsx
- components/WatchlistStarButton.tsx
- components/AlertsSubscribeClient.tsx
- components/SiteHeader.tsx
- components/SiteFooter.tsx
- components/SearchAutocomplete.tsx
- components/home/HomeContentSafe.tsx

## Data pipeline touchpoints (jobs, API routes, ingestion scripts)

- Jobs/scripts: scripts/update-listings.ts, scripts/update-historical-prices.ts, scripts/update-sold-listings.ts, scripts/update-fx-rates.ts, scripts/update-fx-rates-auto.ts, scripts/check-alerts.ts
- Ingestion: scripts/ingest_pokemon_sets.ts, scripts/import-pokemontcg-catalog.ts, scripts/import-tcgplayer-catalog.ts, scripts/seed-cards.ts, scripts/init-db.ts, scripts/rebuild-historical-prices.ts
- API routes: app/api/deals/route.ts, app/api/listings/by-ebay-id/route.ts, app/api/cards/[cardId]/other-markets/route.ts, app/api/market/route.ts, app/api/search-cards/route.ts, app/api/historicals/[cardId]/route.ts
- Alerts/watchlist: app/api/alerts/subscribe/route.ts, app/api/alerts/unsubscribe/route.ts, app/api/watchlist/route.ts, app/api/watchlist-cards/route.ts
- Admin/debug/health: app/api/admin/_, app/api/debug/_, app/api/health/route.ts

## Cross-cutting primitives (tooltip/skeleton/badge/table/price/error/empty/loading)

- Tooltip: components/TooltipPopover.tsx, components/TooltipPopoverClientOnly.tsx, components/SellerNameWithTooltip.tsx
- Skeleton: none found by name (no _Skeleton_ component; no app/\*\*/loading.tsx files).
- Badge: components/ConfidenceChip.tsx, components/TrustedBadge.tsx, components/SellerSeenBadge.tsx, components/WhyDealHint.tsx
- Table: components/DealsTable.tsx, lib/tableColumns.tsx, lib/tableColumnConfig.ts
- Price: lib/money.ts, lib/pricing.ts, lib/dealFormatting.ts, lib/priceGuard.ts
- Error: app/global-error.tsx
- Empty: components/DealsTable.tsx, components/CardDetailClient.tsx, app/sets/page.tsx, app/sets/[setId]/page.tsx, app/search/page.tsx
- Loading: components/WatchlistPageClient.tsx, components/WatchlistPageApi.tsx, components/DealsTable.tsx, components/CardDetailClient.tsx, components/SearchAutocomplete.tsx

This is not a port plan. This is a map.

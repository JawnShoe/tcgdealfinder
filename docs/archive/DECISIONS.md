## SHIFT LOCK — 2025-12-18 (Codex → Claude)

### DONE + LOCKED
- Watchlist v1 is 100% client-side/localStorage; no backend, ingestion, or scoring changes were made, and the ⭐ toggle now appears on the homepage table, /newest, /top-deals, the featured module, and card detail listings.
- Seller trust layout is standardized everywhere: line 1 shows the seller name plus shield, line 2 shows a muted ⭐ X+ sales only when sellerFeedbackCount ≥ 100.
- Top Deals’ public table intentionally exposes only Card / Total / Historic / Discount / Seller / Market / Ends; Condition / Score / Price Conf remain hidden while underlying logic stays untouched.
- Global UI scale baseline was raised via global styles (+~8–10% typography + control padding) so 100% zoom renders with the intended readability.
- Pokémon set ingestion now sources from the Pokémon TCG API v2 with idempotent upserts keyed by canonical set id, capturing series, release date, total cards, and optional symbol/logo URLs.

### Known ISSUES / INTENTIONAL GAPS
- Layout parity regression: /sets and /sets/[setId] currently sit flush to the viewport edges and need the shared page-shell container.
- /watchlist still lacks the shared page shell/header rhythm.
- Some sets legitimately ship without symbol/logo URLs from the API; we intentionally omit icons instead of fabricating placeholders.

### NEXT SINGLE TASK
Unify page-shell/container spacing across /sets, /sets/[setId], and /watchlist so they match the homepage/top-deals/newest rhythm—no redesigns, just wrapper parity.

### STOP RULES FOR CLAUDE
- Do not touch ingestion, scoring, canonical IDs, overrides, or deal queries while addressing layout parity.
- Do not refactor table/deal components; simply wrap existing content with the standard container.
- Keep scope limited to layout/spacing parity (no new features or hero redesigns).

## Seller storefront + pricing presentation

- Best Trusted Deal totals explicitly represent `item price + shipping`; if shipping is unknown we show “+ shipping at checkout”.
- The CTA block shows “Last updated … • Price may have changed on eBay” so users understand pricing latency.

## Cross-market deduplication

- Canonical listing identity is `listing_id` (fallback to the numeric DB id).
- When duplicate listing IDs appear across markets we keep a single row using the priority **US → CA → GB → AU → others**. Ties fall back to the lowest total price.
- Listings with different IDs are never fuzzy-merged; the market badge communicates regional context.

## ENDS display rule

- Public surfaces show relative time (“Ends in 2h 15m”, “Ended”) with a UTC tooltip, powered by `getEndsAtDisplay()` in `lib/dealFormatting.ts`.
- Debug/Admin views keep their absolute UTC formatting for investigative clarity.

## Watchlist v1

- Watchlist is card-level only and stored in `localStorage` under `tcgdf_watchlist_v1` with a schema of `{ version: 1, entries: [...] }`.
- Entries store `id`, `cardName`, and `setName` so `/watchlist` can render purely from local data—no API calls or DB lookups.
- All public deal surfaces (homepage featured cards, tables, set detail, card detail) render the same ⭐ toggle via `WatchlistStarButton`.
- The `/watchlist` page is client-only and simply links back to `/cards/[cardId]`; removing an entry never touches the server.
- Allowlist note: `components/FeaturedDeals.tsx` was explicitly approved for Watchlist V1 so the homepage “featured deals” module can host the shared ⭐ control. No other files were added to the scope.

## Seller trust inline sales badge

- We surface seller sales volume directly in-line next to the seller name using `sellerFeedbackCount` (our closest proxy for “completed sales”).
- The badge only appears when the seller has ≥100 sales; counts are rounded down to the nearest hundred below 10k and to the nearest thousand at 10k+, producing values such as `100+`, `2,300+`, or `45,000+`.
- The shared helper `formatSellerSalesCount()` lives in `components/SellerNameWithTooltip.tsx`; consuming surfaces are responsible for wrapping it in the `⭐ … sales` text so we can keep styling context-specific.

## Top Deals default columns

- The public `/top-deals` table intentionally limits itself to `Card`, `Total`, `Historic`, `Discount`, `Seller`, `Market`, and `Ends` so the hero surface stays scannable.
- The same underlying data (condition, score, price confidence) still exists for filtering/sorting, but those columns remain hidden unless we design a richer analytical view.

## Global UI scale baseline

- Body typography is sized at `1.05rem` with slightly increased line height so the default 100% zoom feels like the previous ~110% view; this improves legibility without needing browser zoom hacks.
- Panels, table rows, form controls, and watchlist buttons all received proportional padding/height increases (roughly +10%) via global CSS so individual components stay in sync with the typography scale.

## Pokémon set catalog

- Pokémon set data comes from the Pokémon TCG API v2 `sets` endpoint; the canonical identifier is the API’s `id`, stored as `catalog_sets.pokemontcg_io_set_id`.
- The ingestion script `npx tsx scripts/ingest_pokemon_sets.ts` fetches every set, normalizes dates/series/total card counts, and upserts rows so the process is safe to rerun.
- Optional symbol/logo URLs are stored when provided; we never delete sets through this importer, only insert or update.

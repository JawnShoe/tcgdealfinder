## Baseline patch – trust fixes

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/top-deals`
  - `/cards/5` Best Trusted Deal block + CTA
  - `/sets/lost-origin` (representative set view)
  - `/debug/exclusions` toggles for `3d`, `7d`, `30d`
  - `/ending-soon` deferral placeholder (no listings fetched)

## Watchlist v1

- `npm run build`
- `npm run lint`
- Local smoke:
  - `/` (homepage) ⭐ toggles visible on featured grid + desktop/mobile table; starring persists after reload and /watchlist reflects it; no hydration warnings
  - `/newest` Card column shows watchlist star; toggles persist after reload and /watchlist stays in sync
  - `/` featured grid shows each card only once (deduped by card)
  - `/` star toggle adds/removes entry and persists after reload
  - `/top-deals` star toggle works on table rows
  - `/sets/lost-origin` hot-card stars add/remove entries
- `/cards/5` hero star syncs with watchlist
- `/watchlist` reflects saved cards and links to `/cards/[cardId]`

## Featured deals card polish

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/` Featured Deals cards show price, discount, seller + badge, market flag, ⭐, and CTAs; no score or ends text present

## Seller trust inline sales badge

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/` and `/top-deals` table rows show “⭐ … sales” for sellers with ≥100 sales without shifting layout
  - Featured deals cards display the inline sales text and still align seller + Trusted badge
  - `/cards/5` listings table includes the same inline badge (line 1: seller 🛡, line 2: ⭐ … sales); mobile/table views remain readable
  - `/top-deals` hides Condition / Score / Price Conf columns (Card, Total, Historic, Discount, Seller, Market, Ends remain)
  - Seller cells render `sellerName 🛡 ⭐ … sales` ordering on both desktop and mobile tables; `/` and `/newest` stay hydration-error free

## Global scale adjustment

- `npm run build`
- `npm run lint`
- Manual smoke at 100% zoom:
  - `/` featured grid + deals table text feels ~10% larger, no unwanted wrapping/scroll
  - `/top-deals` lean column set still fits within viewport width
  - `/newest` table + filter controls look balanced with taller inputs
  - `/cards/5` hero + listings + chart remain readable without overlaps
  - `/watchlist` empty/saved states still align after the typography bump

## Pokémon set ingestion

- `npx tsx scripts/ingest_pokemon_sets.ts`
- `npm run build`
- `npm run lint`
- DB checks:
  - Compare `SELECT COUNT(*) FROM catalog_sets` before/after
  - Spot-check 5 sets across eras (Base, Gym, EX, BW, Sword & Shield, Scarlet & Violet)
- Runtime smoke:
  - `/sets` lists the new sets and paginates
  - Clicking 3 random rows loads `/sets/[setId]` successfully
  - Legacy fallback still works if catalog query fails

## Set browse polish

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/sets` uses the standard page shell (H1 + subtitle) and groups sets by series newest-first; cards render logos/symbols without broken images
  - `/sets/[setId]` hero shows the logo, metadata grid (series, release date, total cards, catalog coverage), and “Jump to deals/catalog cards” controls
  - “Jump to deals” and “Jump to catalog cards” land in the correct sections; the catalog cards table is padded, readable, and the empty state shows Back/View deals actions
  - Navigating between modern/legacy sets keeps layouts consistent and does not regress card or deal surfaces

## Layout parity / container (SHIFT LOCK focus)

- `npm run build`
- `npm run lint`
- Manual smoke:
  - `/` homepage content sits within the shared max-width container with consistent padding (no edge-flush hero/table)
  - `/top-deals` uses the same shell and shows the lean column set with the two-line seller layout
  - `/newest` shares the same shell and seller layout
  - `/watchlist` must adopt the shared shell/header rhythm (currently failing)
  - `/sets` must adopt the shared shell/header rhythm (currently failing)
  - `/sets/[setId]` must show the hero/header plus padded catalog cards table (currently failing)
- Note: Fix is wrapper/container parity only, not a data/logic change.

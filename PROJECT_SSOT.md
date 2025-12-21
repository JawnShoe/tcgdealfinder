# PROJECT SSOT — TCG Deal Finder

**Last Updated**: 2025-12-21
**Status**: Layout parity complete; header typography unified; PokAcmon Set Coverage AUDITED (API-complete); Empty States + Retention Nudges DONE; Card Page Internal Navigation DONE; "No Deals Right Now" Intelligence DONE.

---

## Project Notes

**Ops / Maintenance**:
- Removed experimental git worktree `tcg-pr1a` on 2025-12-18 (no code changes).
- Applied Neon migration `004_add_seller_blacklist_history` on 2025-12-20; verified via `to_regclass()`; `/admin/blacklist` banner cleared; history rows confirmed on unblacklist.

### Security / Admin Access
**Admin gate mechanism**:
- Admin unlock via `POST /api/admin/login` with secret in body; sets HttpOnly `admin_auth` cookie (SameSite=Strict, Secure, Path=/, Max-Age=7d).
- `/admin/*` pages check `admin_auth` cookie and return `notFound()` (404) when missing/invalid.
- `/api/admin/*` routes check `admin_auth` cookie; `x-admin-secret` header is a deprecated fallback for internal scripts.
- `/debug/*` uses `DEBUG_ADMIN_TOKEN` via cookie/header/query (see `lib/debugAuth.ts`); separate from admin gate.

**Admin-protected routes**:
- Pages: `/admin/exclusions`, `/admin/blacklist`, `/admin/alerts`, `/admin/listings`
- APIs: `/api/admin/alerts/create`, `/api/admin/alerts/toggle`, `/api/admin/alerts/delete`, `/api/admin/blacklist-seller`, `/api/admin/hide-listing`

**404 vs 401**:
- Admin pages intentionally return 404 on auth failure (`notFound()`), hiding route existence.
- Admin APIs return 401 on auth failure.

**Deep-link behavior**:
- Admin pages 404 until the cookie is set; debug surfaces only provide an unlock modal and no secret-bearing links.

**Invariant**:
- No admin secrets in URLs; do not paste or log admin secrets.

**Neon migration note**:
- To apply `migrations/004_add_seller_blacklist_history.sql`, open Neon SQL editor and run the file contents.
- Verify with: `SELECT to_regclass('public.seller_blacklist_history') IS NOT NULL AS exists;`

### Listing Exclusion (Admin)
- Single-listing exclusions live in `listing_overrides` (`override_type = HARD_BLOCK`) and are managed via `/admin/listings`.
- Excluded listings never surface on public pages (enforced in `shouldExcludeListingFromCardSurfaces` used by deals queries + page filters).
- Use listing exclusion for isolated bad listings; use seller blacklist for systemic seller abuse.
- Debug views display overrides as exclusion badges.

**FRESHNESS + TIMEZONE CLARIFICATION (2025-12-20)**:
- Canonical freshness timestamp across the system is `Deal.updatedAt`, sourced from `listings.updated_at` in the database.
- Freshness ("Updated Xm ago") renders ONLY when `updated_at` <= 4 hours old.
- Future timestamps (negative freshness) are explicitly guarded and render nothing.

**IMPORTANT (Neon / DB)**:
- Neon/Postgres timestamps (`now()`, `updated_at`) are stored and returned in UTC.
- When checking freshness manually in Neon, timestamps may appear "in the future" if compared directly to local time.
- This is expected behavior; always compare in UTC or convert before reasoning about freshness.

**OPS NOTE**:
- If listings ingestion fails or is throttled (e.g. Shopping API IP limit exceeded), `updated_at` will not advance.
- In that case, freshness will not appear on UI surfaces even though rendering logic is correct.

**Audits**:
- **Pokémon Set Coverage** (2025-12-18): Confirmed API-complete. Database contains all 170 sets from Pokémon TCG API v2 with perfect 1:1 match. All sets have `pokemontcg_io_set_id` populated. Rendering verified on `/sets` and `/sets/[setId]`. Marked as [DONE ✅] in ROI backlog.

**Performance Notes**:
- **"More from this set" query** (2025-12-18): The `getCardsFromSameSet()` query filters by `set_name` with LIMIT 6. Current schema has a UNIQUE constraint index on (name, set_name, card_number, condition_bucket), but set_name is not the leading column. Query performance is acceptable for current dataset size, but may benefit from a dedicated index on `cards(set_name)` if card count grows significantly. Recommendation: Monitor query performance; add `CREATE INDEX cards_set_name_idx ON cards(set_name)` if needed.

---

## CURRENT REALITY: Page Inventory

### Public Pages (Production)

| Route | Status | Container | Header Typography | Notes |
|-------|--------|-----------|-------------------|-------|
| `/` (Homepage) | ✅ BASELINE | `max-w-7xl px-4 sm:px-6 lg:px-10` | `PAGE_TITLE` + `PAGE_SUBTITLE` | Featured deals + live deals table |
| `/top-deals` | ✅ BASELINE | `max-w-7xl px-4 sm:px-6 lg:px-10` | `PAGE_TITLE` + `PAGE_SUBTITLE` | Lean columns (7 visible) |
| `/newest` | ✅ BASELINE | `max-w-7xl px-4 sm:px-6 lg:px-10` | `PAGE_TITLE` + `PAGE_SUBTITLE` | Newest listings |
| `/ending-soon` | ✅ BASELINE | `max-w-7xl px-4 sm:px-6 lg:px-10` | `PAGE_TITLE` + `PAGE_SUBTITLE` | Deferred implementation |
| `/watchlist` | ✅ FIXED | `max-w-7xl px-4 sm:px-6 lg:px-10` | `PAGE_TITLE` + `PAGE_SUBTITLE` | Client-only localStorage |
| `/sets` | ✅ FIXED | `max-w-7xl px-4 sm:px-6 lg:px-10` | `PAGE_TITLE` + `PAGE_SUBTITLE` | Catalog set browser |
| `/sets/[setId]` | ✅ FIXED | `max-w-7xl px-4 sm:px-6 lg:px-10` | Custom (detail page) | Hero + hot cards + deals + catalog |
| `/cards/[cardId]` | ⚠️ CUSTOM DETAIL PAGE | Custom hero + detail shell | Custom detail typography | Best Trusted Deal block + "More from this set" navigation (intentional divergence) |
| `/search` | ⚠️ CUSTOM | TBD | TBD | Card search |
| `/catalog` | ⚠️ CUSTOM | TBD | TBD | Catalog browser |
| `/catalog/sets/[catalogSetId]` | ⚠️ CUSTOM | TBD | TBD | Catalog set detail |
| `/alerts` | ⚠️ CUSTOM | TBD | TBD | Public alerts page |

**/sets/[setId] surfacing definitions**
- "Hot cards in this set" is deal-driven: cards appear via live deals and deal heuristics only.
- "Most watched cards" is watchlist-driven: cards rank by watchlist frequency regardless of live deals.
- These concepts are distinct and must never be conflated in UI, logic, or documentation.

### Admin/Debug Pages

| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | ⚠️ ADMIN | Admin hub (tabs: Exclusions, Blacklist, Listings) |
| `/admin/exclusions` | ⚠️ ADMIN | Exclusions quarantine panel (read-only) |
| `/admin/alerts` | ⚠️ ADMIN | Alert management |
| `/admin/blacklist` | ⚠️ ADMIN | Seller blacklist management |
| `/admin/listings` | ⚠️ ADMIN | Single-listing exclusion tool |
| `/debug/exclusions` | ⚠️ DEBUG | Debug-only exclusions + integrity review (deprecated for operators) |

- `/admin/blacklist` shows active blacklist entries plus history; unblacklist writes history first and restore re-adds without deleting history.
- `/admin` is the canonical operator workflow (hub + tabs); `/admin/exclusions` renders the exclusions panel in admin.
- `/admin/exclusions` redirects to `/admin?tab=exclusions` for back-compat.
- `/debug/exclusions` is debug-only and deprecated for operators; a banner points operators to `/admin`.
- `/debug/exclusions` displays seller blacklist status pills and an admin tools chip (unlock modal; no URL secrets, no direct deep-link).
- Blacklist mutations + history remain on `/admin/blacklist` only.
- Listing exclusions (single listing) are managed only on `/admin/listings`.
- `/admin/blacklist` shows a banner if `seller_blacklist_history` is missing.

---

## LOCKED SYSTEMS (DO NOT TOUCH)

### Watchlist v1 (LOCKED ✅)
- **Storage**: Client-only `localStorage` under `tcgdf_watchlist_v1`
- **Schema**: `{ version: 1, entries: [{ id, cardName, setName }] }`
- **UI**: `WatchlistStarButton` component on all deal surfaces
- **Surfaces**: Homepage featured + table, `/newest`, `/top-deals`, set detail hot cards, card detail
- **Page**: `/watchlist` renders from localStorage only, no API calls
- **Backend**: NONE - no server-side watchlist logic exists

### Seller Trust Display (LOCKED ✅)
- **Line 1**: Seller name + shield (🛡)
- **Line 2**: `⭐ X+ sales` only when `sellerFeedbackCount ≥ 100`
- **Formatting**: Rounded down (100+, 2,300+, 45,000+)
- **Helper**: `formatSellerSalesCount()` in `components/SellerNameWithTooltip.tsx`
- **Displayed label**: Prefer the eBay store name when available; fall back to the seller username when store data is missing.
- **Tooltip contents**: Shows both identities (Store + Account) when present, along with feedback percentage and rounded sales count.
- **Identity contract**: "Seller (eBay)" references the seller provided by eBay; showing the store name in UI is a readability choice over the same account.
- **Storefront enrichment**: The eBay Shopping API feeding storefront data was decommissioned on 2025-02-04; any remaining enrichment calls are best-effort legacy fallbacks that can fail unpredictably (IP/rate limits, endpoint retirement). When storefront data is missing, the UI must fall back to the seller username—this is expected behavior and not a UI bug.
- **Audit note (2025-12-20)**: Storefront coverage currently sits below 1% across markets (see `docs/storefront_enrichment_audit.md`); enrichment still depends on the deprecated Shopping API and frequently hits `IP limit exceeded`.
- **Phase 1 UI clarification (2025-12-20)**: Public surfaces now display the store name alone when present (otherwise the seller username); tooltips always show the username in the “Account” row and only add a “Store” row when a storefront exists. UI-only change—no backend or enrichment modifications.
- **HTML scraping**: Not present in the codebase (verified 2025-12-20).
- **Browse vs Shopping invariant**: Browse API is the canonical ingestion source; Shopping API may be called opportunistically for storefront names but must not be relied upon.

### Top Deals Columns (LOCKED ✅)
- **Visible**: Card, Total, Historic, Discount, Seller, Market, Ends (7 columns)
- **Hidden**: Condition, Score, Price Confidence (exist in data, not shown)
- **Reason**: Keep hero surface scannable

### Global UI Scale (LOCKED ✅)
- **Body font**: `1.05rem` with increased line-height
- **Controls**: +10% padding/height across panels, tables, forms, buttons
- **Baseline**: Treat 100% zoom as the reference (feels like old 110%)

### Pokémon Set Ingestion (LOCKED ✅)
- **Source**: Pokémon TCG API v2 `/sets` endpoint
- **Identifier**: `catalog_sets.pokemontcg_io_set_id` (canonical)
- **Script**: `npx tsx scripts/ingest_pokemon_sets.ts`
- **Operation**: Idempotent upserts (safe to rerun)
- **Data**: Series, release date, total cards, symbol/logo URLs (when available)

### Deal Systems (LOCKED ✅)
- **Best Trusted Deal**: `item price + shipping` (or "+ shipping at checkout")
- **Cross-market dedup**: Priority US → CA → GB → AU, by `listing_id`
- **ENDS display**: Relative time ("Ends in 2h 15m") with UTC tooltip via `getEndsAtDisplay()`
- **Canonical ID**: `listing_id` (fallback to numeric DB id)

- **Pricing fields**: Each listing stores its native total plus a USD total (`total_usd`) computed at ingestion.
- **Total USD render**: All "Total USD" surfaces show the stored `total_usd` (per the Price Integrity Fix).
- **Why eBay can differ**: eBay may show convenience FX, taxes, or buyer-location adjustments; our USD reflects the locked conversion captured at ingestion time.

- **Historic baselines**: Stored in CAD as the global reference unit and rendered into USD at display time?this is intentional and not a bug.

_Future consideration (deferred; requires separate Tier-1 audit and explicit approval)_: Migrating historic baseline storage to USD can only occur after multi-market baselines exist and a full Tier-1 review passes. No action is authorized today.

---

## LAYOUT BASELINE (LOCKED ✅)

### Container Pattern
```tsx
<main className="bg-slate-50 text-slate-900">
  <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-[4|6|8] pb-8">
    {/* content */}
  </div>
</main>
```

### Header Pattern
```tsx
<div className="space-y-2">
  <h1 className={PAGE_TITLE}>Page Title</h1>
  <p className={PAGE_SUBTITLE}>
    Page subtitle description
  </p>
</div>
```

**Constants** (`lib/typography.ts`):
- `PAGE_TITLE = "text-2xl font-semibold tracking-tight text-slate-900"`
- `PAGE_SUBTITLE = "text-sm text-slate-600"`

### Table Container
```tsx
<div className={TABLE_CONTAINER}>
  {/* table or content */}
</div>
```

**Constant** (`lib/typography.ts`):
- `TABLE_CONTAINER = "rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 lg:px-10"`

---

## ACTIVE WORK

ACTIVE WORK: NONE

---

## COMPLETED (2025-12-21)

### Data reliability label completion (follow-up fix)
- **Change**: Extended "Price conf." → "Data reliability" rename to all remaining surfaces with tooltips.
  - **CardDetailClient**: Filter label + table header (filter and listings table)
  - **TopDealsClient**: Filter label
  - **DealsTable**: Table header (was missed in prior commit)
  - **FeaturedDealsStrip**: Row label
  - **tableColumns.tsx**: Column header definition
- **Routes/components**: `/cards/[cardId]`, `/top-deals`, `/`, `/newest`; `components/CardDetailClient.tsx`, `components/TopDealsClient.tsx`, `components/DealsTable.tsx`, `components/FeaturedDealsStrip.tsx`, `lib/tableColumns.tsx`
- **Classification**: UI/copy cleanup (follow-up to audit loose ends)
- **Status**: COMPLETE (2025-12-21)
- **Commit**: ab4ddb6

### Audit loose ends cleanup
- **Change**: Minor UI/copy cleanup to close remaining audit items.
  - **Watchlist**: Standardized empty-state icon from ⭐ to ☆ for consistency with UI
  - **DealsTable**: Renamed "Price conf." filter to "Data reliability" with tooltip explaining meaning
  - **Admin Listings**: Fixed timezone label from "UTC" to "in your local timezone" (datetime-local uses browser time)
  - **Admin Blacklist History**: Renamed "Restore" button to "Re-blacklist" with tooltip; updated toast messages
- **Routes/components**: `/watchlist`, `/`, `/admin/blacklist`, `/admin/listings`; `app/watchlist/page.tsx`, `components/DealsTable.tsx`, `components/AdminListingsClient.tsx`, `components/AdminBlacklistClient.tsx`
- **Classification**: UI/copy cleanup
- **Status**: COMPLETE (2025-12-21)
- **Commit**: 6cd11f8


### "No Deals Right Now" Intelligence (Tier 1.5)
- **Change**: Added intelligence block to card detail empty state when no visible listings remain (after filters). Shows recent sold range, deal frequency hint, and a watchlist CTA.
- **Routes/components**: `/cards/[cardId]`; `components/CardDetailClient.tsx`
- **Classification**: Feature addition (display-only, read-only aggregation)
- **Blast radius**: Card detail page only
- **Data sources**: Existing `historicals` prop + existing `/api/historicals/[cardId]` fetch (no new queries)
- **Status**: COMPLETE (2025-12-21)
- **Commit**: 6b2581b
- **No Tier-1 systems touched**: Yes (no ingestion, scoring, or query logic changes)

## COMPLETED (2025-12-20)

### Public trust surface cleanup
- **Change**: Removed internal/debug terminology from public-facing pages to improve visitor trust.
  - **ListingLookup** (Home): Removed debug fields (rejectSource, rejectDetail, collectorNumber signals, confidence values); now shows only "This listing isn't available right now" + optional "It may have been removed or failed verification"
  - **Sets page**: Replaced CLI command in empty state ("Run npm run ingest:pokemon-sets...") with "Catalog not yet loaded. Please check back soon."
  - **Set Details page**: Replaced "Awaiting catalog sync" with "Card data for this set is loading. Check back shortly."; replaced "No under-historic deals" jargon with "No deals below recent median"
  - **Newest Deals**: Hid "Integrity Review" badge entirely from public visitors (Option A - safest)
- **Routes/components**: `/` (Home), `/sets`, `/sets/[setId]`, `/newest`; `components/ListingLookup.tsx`, `components/DealsTable.tsx`, `app/sets/page.tsx`, `app/sets/[setId]/page.tsx`
- **Classification**: UI/copy cleanup (Tier-1 trust)
- **Status**: COMPLETE (2025-12-20)
- **Commit**: 49a02cd

### Admin blacklist intake form
- **Change**: Added "Add seller to blacklist" form at top of Blacklist tab. Operators can now blacklist sellers directly from the admin hub without context-switching. Uses same INSERT logic as inline "Blacklist seller" actions.
- **Routes/components**: `/admin?tab=blacklist`, `/admin/blacklist`, `components/AdminBlacklistPanel.tsx`
- **Status**: COMPLETE (2025-12-20)
- **Commit**: 81eff09

### Admin action feedback toasts
- **Change**: Added success/error toast notifications for all admin actions. Blacklist add/remove/restore and listing exclude/restore now show feedback. Forms reset on success for easy repeat actions.
- **Routes/components**: `/admin`, `/admin/blacklist`, `/admin/listings`, `components/AdminActionFeedback.tsx`, `components/AdminBlacklistClient.tsx`, `components/AdminListingsClient.tsx`
- **Status**: COMPLETE (2025-12-20)
- **Commit**: 91316cf

### Admin navigation toolbar
- **Change**: Added shared Admin Tools toolbar on `/admin/exclusions`, `/admin/blacklist`, `/admin/listings`.
- **Status**: COMPLETE (toolbar added)
- **Commit**: a7eb235

### Admin hub + exclusions consolidation
- **Change**: Added `/admin` hub with tabs (Exclusions, Blacklist, Listings); `/admin/exclusions` renders the exclusions panel in admin (read-only); `/debug/exclusions` shows a deprecation banner for operators.
- **Status**: COMPLETE
- **Invariant**: Admin cookie gate unchanged; debug token gate unchanged; no URL secrets.

### Admin exclusions theme parity
- **Change**: Admin hub Exclusions tab now matches admin theme (light surfaces, tables, badges).
- **Routes/components**: `/admin`, `/admin/exclusions`, `components/AdminExclusionsPanel.tsx`, `app/debug/exclusions/ExclusionsClient.tsx`
- **Status**: COMPLETE (2025-12-20)

### Admin blacklist seller link-out
- **Change**: Seller usernames on the admin blacklist tab link out to the seller's eBay profile in a new tab.
- **Routes/components**: `/admin`, `/admin/blacklist`, `components/AdminBlacklistPanel.tsx`
- **Status**: COMPLETE (2025-12-20)

### Admin exclusions redirect to hub
- **Change**: `/admin/exclusions` redirects to `/admin?tab=exclusions` (back-compat; canonical workflow remains `/admin`).
- **Routes/components**: `/admin/exclusions`, `components/AdminToolbar.tsx`, `components/AdminExclusionsPanel.tsx`
- **Status**: COMPLETE (2025-12-20)

### Admin blacklist history guard
- **Change**: `/admin/blacklist` shows active sellers even if `seller_blacklist_history` is missing; banner prompts migration
- **Commit**: 51f477b

### Admin cookie gate + listing exclusion tool
- **Admin auth**: Cookie-based gate (`admin_auth` via `/api/admin/login`), 404 on `/admin/*`, admin APIs accept cookie with deprecated `x-admin-secret` fallback
- **Listing exclusion**: `/admin/listings` manages single-listing exclusions via `listing_overrides` (`HARD_BLOCK`), used for precise listing removal without seller-wide ban
- **Applied**: `v1|226490668389|0` excluded (reason: manual: misleading listing)
- **Commits**: 70a6297, 29c41b8

### Debug exclusions seller blacklist status + admin unlock
- **Implementation**: Seller blacklist visibility implemented on `/debug/exclusions` (commit 48648e9)
- **Update**: Deep-link removed; admin unlock modal added (commit 70a6297)
- **Polish**: Admin tools chip + compact status pills (commit 13843ce)
- **Documentation**: SSOT clarification only (commit fe8c59c)
- **SSOT fix**: Clarified implementation vs documentation commits (commit fb27c1a)
- **Invariant**: All blacklist mutations (add/remove/restore) remain restricted to `/admin/blacklist`

### Freshness timestamp wiring audit + unify
- **Classification**: Bug fix (Tier 1 consistency)
- **Canonical field**: `Deal.updatedAt` (from `listings.updated_at`) is used across tables + card detail + Best Trusted Deal
- **UI rule**: freshness shows only when <= 4 hours; future timestamps render nothing; Best Trusted Deal uses "Updated Xm ago" (no time-of-day)
- ✔ Unified freshness rendering across tables, card detail, and Best Trusted Deal using `Deal.updatedAt`
- ✔ Removed time-of-day freshness labels; standardized on relative freshness only (<=4h)
- ✔ Guarded against future/negative freshness values

### Freshness micro-signal correctness + FeaturedDeals de-crowd + blacklist history/undo
- **Classification**: Bug fix + UI parity + admin safety
- **Freshness**: `formatFreshness()` hides future timestamps; negative durations cannot render; 4-hour rule enforced
- **FeaturedDeals**: freshness removed from homepage cards only (tables + card detail retain the 4-hour rule)
- **Blacklist**: `/admin/blacklist` shows active + history; unblacklist writes history before delete; restore re-adds without deleting history

### Store Name Source Audit — DONE (NO-GO)
- Checked Sell Stores API `getStore`, Trading API `GetStore`/`GetUser`/`GetItem`, and Buy Browse API seller payloads.
- Conclusion: no supported eBay API exposes third-party storefront display names without seller consent; Browse only returns usernames; Shopping is deprecated/unsupported.
- Invariant: storefront names remain best-effort bonus only; UI must treat username fallback as the default.

## COMPLETED (2025-12-19)

### Price Integrity Fix — DealViewModel USD field
- **Classification**: Bug fix (Tier 1 trust)
- **Root cause**: `DealViewModel` ignored `total_usd` from the DB and re-used native totals via `getDealPrice()`, so CA/UK/AU listings labeled “Total USD” showed CAD values (e.g., listing `v1|177383271547|0` rendered $492.90 instead of the stored $354.89 USD).
- **Fix**: View-model `totalUsd` now reads `deal.totalUsd` directly and leaves nulls untouched; table columns switch to `formatUSD` so USD values render without re-conversion. No scoring, ingestion, or schema changes.
- **Verification**:
  - Commands: `npm run lint`, `npm run build`
  - Spot checks (DB vs UI): `v1|177383271547|0`, `v1|306510934165|0`, `v1|394169903660|0`, `v1|226490668389|0`, `v1|116806036572|0` (view-model totals match DB `total_usd`)

## COMPLETED (2025-12-18)

### Layout Parity ✅
- **Fixed**: `/sets`, `/sets/[setId]`, `/watchlist`
- **Changes**: Replaced undefined `page-shell` class with baseline container pattern
- **Result**: All public listing pages now use consistent max-width + responsive padding

### Header Typography Unification ✅
- **Fixed**: `/watchlist`, `/sets`
- **Changes**:
  - Replaced `text-3xl font-bold` → `text-2xl font-semibold tracking-tight`
  - Replaced `text-base` subtitle → `text-sm`
  - Removed "Catalog" kicker from `/sets`
- **Result**: All public listing pages use `PAGE_TITLE` + `PAGE_SUBTITLE` constants

### Empty States + Retention Nudges ✅
- **Fixed**: `/watchlist`, `/cards/[cardId]`
- **Changes**: UI-only copy + UI-state messaging (conditional on listings length); no data, scoring, or ingestion changes.
  - Empty watchlist: "You haven't starred any cards yet." + "⭐ Star cards to track deals"
  - Card page with zero deals: "No live deals right now" + "Deals appear periodically for this card." + "⭐ Watch this card"
- **Result**: Clear retention messaging when users encounter empty states
- **Note**: Zero-deals state not observable in current dataset; filtered-out state verified.

### Card Page Internal Navigation ✅
- **Fixed**: `/cards/[cardId]`
- **Change Classification**: Feature addition (not UI-only)
- **Blast Radius**: `app/cards/[cardId]/page.tsx` + `components/CardDetailClient.tsx`
- **Changes**: Added server-side query for related cards; no scoring, ingestion, or pricing changes.
  - Added "More from this set" section displaying up to 6 related cards from the same set
  - New query: `getCardsFromSameSet()` filters by `set_name` with LIMIT 6
  - Cards link to their respective `/cards/[cardId]` pages
  - Section only renders when related cards exist (no empty state for v1)
  - **UX Adjustment** (2025-12-18): Moved section higher (after hero, before filters) for better discoverability; added "View set page →" link to section header navigating to `/sets/[setName]#catalog-cards`
- **Result**: Improved discoverability and navigation between cards in the same set

### Deal Freshness Micro-Signal ✅
- **Fixed**: DealsTable + CardDetailClient (FeaturedDeals freshness removed on homepage cards to reduce crowding)
- **Change Classification**: Feature addition (display-only trust signal using existing updated_at timestamp; no scoring, ingestion, or pricing changes)
- **Blast Radius**: `types/deal.ts`, `app/api/deals/dealsQuery.ts`, `lib/dealFormatting.ts`, `components/DealsTable.tsx`, `components/FeaturedDeals.tsx`, `components/CardDetailClient.tsx`, plus all pages that construct Deal objects
- **Changes**: Added subtle freshness indicator showing how recently deals were checked
  - Added `updatedAt` field to `Deal` type
  - Canonical timestamp: `listings.updated_at` / `Deal.updatedAt` used across tables + card detail + Best Trusted Deal
  - Created `formatFreshness()` helper function with 4-hour threshold
  - Returns "Xm" or "Xh" format when recent; returns `null` when stale or future-dated (negative durations never display)
  - Added inline freshness display next to deal prices on:
    - **DealsTable**: Desktop + mobile views (shows below price)
    - **CardDetailClient**: Best Trusted Deal box + listings table
  - **FeaturedDeals**: freshness removed from homepage cards (de-crowd decision)
  - Styling: `text-xs text-slate-500` (matches seller sales badge visual priority)
  - Only displays when `updatedAt ≤ 4 hours`; disappears entirely when older
- **Result**: Quiet trust signal reassuring users that deal data is fresh without adding visual noise

---

## KNOWN ISSUES / INTENTIONAL GAPS

### Intentional Design Choices
- `/sets/[setId]` uses custom typography (text-3xl font-bold) and has "Pokémon set" kicker - this is correct for a detail page hero
- Some sets lack symbol/logo URLs from API - we intentionally omit icons rather than fabricate placeholders
- `/cards/[cardId]` uses custom layout - detail pages are allowed to diverge from listing page patterns

### No Current Issues
- All layout parity work complete
- All header typography unified across listing pages
- No regression issues detected

---

## STOP RULES (PERMANENT)

### Never Touch Without Explicit User Request
1. **Ingestion logic** - Pokémon TCG API integration, data normalization, upserts
2. **Scoring systems** - Deal confidence, discount calculation, price confidence
3. **Canonical IDs** - Listing identity, deduplication logic, market priority
4. **Overrides** - Manual integrity overrides, exclusion rules
5. **Deal queries** - Database queries, filtering, sorting, pagination
6. **Watchlist mechanics** - localStorage schema, storage logic, entry management
7. **Seller trust calculations** - Feedback thresholds, badge formatting, shield logic
8. **Table components** - Column definitions, data formatting, shared components

### Keep Scope Minimal
- Prefer editing existing files over creating new ones
- No refactors unless explicitly requested
- No "improvements" or optimizations beyond stated requirements
- No new features or redesigns
- No documentation files unless explicitly requested

---

## FILE REFERENCE

### Key Configuration Files
- `SHIFT_LOCK.md` - Current locks and open tasks
- `DECISIONS.md` - Detailed system decisions and rationale
- `REGRESSION_CHECKLIST.md` - Testing checklist for each feature area
- `PROJECT_SSOT.md` - This file (authoritative current state)

### Key Code Files
- `lib/typography.ts` - Shared typography constants (`PAGE_TITLE`, `PAGE_SUBTITLE`, `TABLE_CONTAINER`)
- `lib/dealFormatting.ts` - Deal display formatting (`formatCurrency`, `getEndsAtDisplay`)
- `lib/useWatchlist.ts` - Watchlist localStorage hook
- `components/WatchlistStarButton.tsx` - Watchlist toggle component
- `components/SellerNameWithTooltip.tsx` - Seller trust display with sales badge
- `components/DealsTable.tsx` - Main deals table component
- `components/FeaturedDeals.tsx` - Homepage featured deals module
- `app/api/deals/dealsQuery.ts` - Shared deal query logic

### Migration Scripts
- `scripts/ingest_pokemon_sets.ts` - Pokémon TCG API v2 set ingestion

---

## REGRESSION TESTING (Always Required)

### Build & Lint
```bash
npm run lint      # Must show: ✔ No ESLint warnings or errors
npm run build     # Must compile all 35 routes successfully
```

### Visual Smoke Tests
- `/` - Featured deals + table layout, watchlist stars, seller trust badges
- `/top-deals` - 7-column layout, seller trust, watchlist stars
- `/newest` - Table layout, watchlist stars, newest-first sorting
- `/watchlist` - Empty state + saved cards, localStorage persistence
- `/sets` - Set grid, series grouping, logos/symbols
- `/sets/[setId]` - Hero, hot cards, deals table, catalog cards table
- `/cards/[cardId]` - Best Trusted Deal block, listings table

### Layout Parity Checks
- All listing pages use `max-w-7xl` container with responsive padding
- Headers use consistent `PAGE_TITLE` + `PAGE_SUBTITLE` typography
- No content flush to viewport edges
- Consistent spacing between sections

---

## ROI BACKLOG (Authoritative List - Do Not Modify)

**Instructions**: This is the authoritative backlog provided by the user. Do not add, remove, reorder, or modify any items. When working on items, mark them with `[IN PROGRESS]` or `[DONE]` inline, but never remove them from this list.

### ROI Backlog Notes (Authoritative)
- Scrydex is a FUTURE data source and is not currently implemented.
- "Full Pokémon Set Coverage" is intentionally left unresolved and will be classified during the SSOT audit.
- This ROI list is inserted verbatim and has not yet been reconciled against current reality.

### Backlog Items

Tier 1 — Core Trust, Clarity, and Comfort (DONE)

These are locked and complete.

Watchlist v1 (card-level, client-only)

Allows users to save cards for quick access.

Seller Trust Signals v1

Displays trust indicators (seller shield, X+ sales count) on card pages.

Best Trusted Deal Clarity

Ensures clarity for item + shipping + staleness hint.

ENDS Formatting

Shows time remaining for deals using "Ends in X" for public-facing elements and UTC for admin.

Cross-Market Duplicate Suppression

Prevents duplicate listings by suppressing identical listing_id from appearing across multiple markets.

Global UI Scale

Increases UI scale by 10% for a more readable experience, while keeping the feel at 100% for consistency.

Status: ✅ All complete

Tier 1.5 — Inventory & Retention Multipliers (NEXT FOCUS)

High ROI, low product risk, mostly additive.

Full Pokémon Set Coverage (SSOT Catalog) [DONE ✅ — API-complete, audited 2025-12-18]

Add all Pokémon TCG sets (historical + modern).

Unlock massive SEO + broader browsing surface.

Prevent "dead-end" searches by ensuring full set data is available.

**Audit Evidence** (2025-12-18):
- Database: 170 Pokémon sets with pokemontcg_io_set_id
- API: 170 total sets from Pokémon TCG API v2
- Match: 100% (all 170 sets match exactly, no gaps)
- Rendering: /sets and /sets/[setId] pages render all sets successfully
- Build: All 35 routes compile without errors

Set Browse UX Polish [PARTIAL]

Group sets by Series (e.g., SV / SWSH / SM / etc.).

Sort by release date (newest first).

Add light filters to improve discoverability.

Empty States + Retention Nudges [DONE ✅]

For empty states (e.g., empty watchlist), show nudges like "No live deals" → ⭐ Watch this card.

Add empty watchlist explanation to prevent user bounce.

**Implementation** (2025-12-18):
- Empty watchlist: Shows "You haven't starred any cards yet." + "⭐ Star cards to track deals"
- Card page with zero deals: Shows "No live deals right now" + reassurance + "⭐ Watch this card"
- UI-only copy + UI-state messaging (conditional on listings length); no data, scoring, or ingestion changes.
- Note: Zero-deals state not observable in current dataset; filtered-out state verified.

Card Page Internal Navigation [DONE ✅]

Add "More from this set" functionality to encourage browsing more cards from the same set.

**Implementation** (2025-12-18):
- Added "More from this set" section on `/cards/[cardId]` displaying up to 6 related cards
- Cards from same set are queried and displayed with name and card number
- Each card links to its detail page for easy navigation
- Section only renders when related cards exist (no empty state)
- Feature addition (internal navigation) using a small server-side query; no scoring, ingestion, or pricing changes.

Deal Freshness Micro-Signal [DONE ✅]

Display "Checked X minutes ago" or a subtle freshness indicator to show how recent the deal data is.

Builds trust with users by providing real-time data cues.

**Implementation** (2025-12-19, updated 2025-12-20):
- Added subtle inline freshness indicator showing "Xm" or "Xh" next to deal prices
- Uses a single canonical timestamp (`Deal.updatedAt` from listings.updated_at) across tables + card detail + Best Trusted Deal
- Only displays when deal updated within last 4 hours; future timestamps render nothing (no negative durations)
- Feature addition (display-only trust signal using existing updated_at timestamp; no scoring, ingestion, or pricing changes)
- Appears on tables + card detail pages; removed from homepage FeaturedDeals cards to reduce crowding
- Styling matches seller sales badge (text-xs text-slate-500)

"No Deals Right Now" Intelligence [DONE]

When no visible listings remain (including filters):

Display recent sold price range.

Show deal frequency (e.g., "appears 2-3x per week").

Provide CTA to watchlist the card for future tracking.

Tier 2 — Engagement & Explainability

Good ROI, moderate scope.

Watchlist v2 (Sorting, Filtering)

Allow users to sort and filter items in their watchlist (e.g., by price, condition, seller rating).

Alerts v1 (Watchlist-Based Email Alerts)

Implement email alerts based on watchlist items (price drop, new listings).

"Why This is a Deal" Micro-Explanation

Add a short explanation like "Seller priced below similar listings" or "Below recent market average" to give users more context.

Market Comparison Hint (Links Only, No Merging)

Provide links to active listings in other markets (e.g., UK/CA) without merging prices.

Keep market distinctions for transparency.

Seller Repetition Trust ("Seen Often on Deals")

If the same seller appears often, show a subtle badge like "Seen on X deals" to increase trust in that seller.

Light Personalization (Based on Watchlist/Sets)

Suggest deals based on watchlist or starred sets, even without a full account system.

Condition Clarity Normalization + Tooltip

Standardize condition terminology (e.g., NM, LP) and provide tooltips explaining how condition impacts pricing.

Set-Level Trends (Most Watched, Recent Deals)

On /sets/[setId], show "Most watched cards in this set" and "Cards with recent deals".

Tier 3 — Power / Risk Features (Deferred)

Explicitly not doing now.

Ending Soon (Auctions)

Add a dedicated "Ending Soon" section for auctions (focused on time-sensitive listings).

Cross-Listing Fuzzy Clustering ("Also Listed in UK")

Provide a hint for cards listed in different markets (e.g., UK, CA), without merging prices.

Scanner / Show-Mode

Introduce a scanner mode to easily track specific cards in physical stores or at shows.

Multi-Source Price Comparison (TCGPlayer, etc.)

Compare prices from multiple sources (e.g., TCGPlayer, eBay) without merging them directly.

USD-native Historic Baseline Migration (Tier 3 Planning Only)
- **Classification**: Tier 3 / deferred planning.
- **Status**: Deferred — no execution authorized; requires future Tier-1 audit and planning approval.

### tcgcsv.com (Deferred Reference Source)
- **Description**: Static CSV exports of TCGPlayer card pricing; no live listings, sellers, or freshness/timing guarantees.
- **Potential future use**: Cross-checking historical baselines; seeding non-live reference prices for future multi-source comparisons.
- **Explicit non-goals**: Not used for live deal detection, ranking, pricing, or discount math; not part of Tier 1 / Tier 1.5 roadmap.
- **Status**: Deferred; do not integrate without explicit planning approval.

Status Check:

✅ Tier 1: Complete and locked.

✅ Tier 1.5: Focus for next sprint, with Full Pokémon Set Coverage as the first item.

⏳ Tier 2: Later stage ideas; will be revisited for further enhancement.

⏳ Tier 3: Deferred for now, to avoid riskier and more resource-heavy features.

---

**ROI Status**: AUDITED
**Audit date**: 2025-12-18
**Audit basis**: Reconciled against current PROJECT_SSOT.md reality

---

## 🔒 Process & Safety Invariants (LOCKED)

This section defines non-negotiable operating rules for planning, implementation, and delegation.
If any instruction, proposal, or change violates these rules, work must stop until resolved.

1. Authority & Decision Ownership
- Product scope, roadmap, and prioritization → User only
- UI/UX changes (visual, layout, typography) → Explicit user approval required
- Implementation details → Coders may decide within locked scope
- Bug fixes → Allowed, must be logged in SSOT
- Refactors → Explicit user approval required

If decision authority is unclear, default to STOP.

2. Change Classification (Required for Every Task)
Every change must be classified as exactly one of the following:
- Bug fix
- UI parity / consistency
- Feature addition
- Refactor
- Documentation only

Unclassified changes are invalid.

3. Blast Radius Declaration
For any change beyond documentation, the implementer must declare:
- Files touched
- Pages affected
- Expected risk level (Low / Medium / High)
- Rollback plan (revert / screenshot / flag)

If blast radius is unknown → STOP.

4. One Active Work Item Rule
At any moment, SSOT may list only one Active Work Item.
New work cannot begin until the current item is completed or explicitly paused.
Parallel work is not allowed.

5. Regression Ownership
Every task must name a regression owner responsible for:
- Running required checks
- Manual visual verification
- Confirming no unintended side effects

If no owner is named, the task is invalid.

6. No Silent UI Drift
Any UI change must include:
- Before state (screenshot or description)
- After state (screenshot or description)
- Explicit classification: parity, cosmetic, or redesign (redesign requires approval)

UI changes without disclosure are forbidden.

7. Decision Memory (Why Things Are Locked)
Significant decisions must be recorded under Locked Decisions with:
- The decision
- The reason
- What problem it prevents

If the reason is forgotten later, the decision still stands.

8. AI Hallucination Guard
- If something is not written in SSOT, it does not exist
- No assumptions based on memory, prior chats, or usual patterns
- SSOT overrides chat history and AI recall

When in doubt → point to the line in SSOT or STOP.

9. SSOT Enforcement Rule
- PROJECT_SSOT.md is the only authoritative source of truth
- Any coder task must update SSOT if facts change
- Planning, delegation, or prioritization cannot proceed unless SSOT is visible and acknowledged in-session

10. Tier-1 Evidence Gate
- Tier-1 issues (price totals, dedup, seller trust, watchlist, featured/best-deal displays) must follow the Evidence Packet workflow in `SHIFT_LOCK.md`.
- No “NO FIX REQUIRED” call is valid without A–E evidence plus the shift handoff checklist defined there.
- If data is missing, the only approved response is “INSUFFICIENT EVIDENCE — NEED DB/UI TRACE”.

10. Violation Handling
If any invariant is violated:
1. Work stops immediately
2. Violation is logged
3. SSOT is corrected
4. Only then may work resume

No exceptions.

11. Tier 1.5 Definition of Done
A Tier 1.5 item is DONE only when:
- The user-visible behavior is implemented
- It is documented in SSOT
- It does not change scoring, ingestion, or Tier 1 behavior

12. Execution Abort Conditions
Work must stop immediately if any of the following occur:
- Any task exceeding estimated scope
- Any need to modify Tier 1 systems
- Any ambiguity about data correctness
- Any disagreement about intended UX

Status:
- This section is LOCKED
- Changes require explicit user approval
- These rules apply to all future work

---

**End of SSOT Document**

> **Archived after Full System Audit closeout (2025-12-26)**

# Frontend & Rendering Code Audit (Archived)

**Audit Date**: 2025-12-26
**Auditor**: Claude Code (Phase 3A - Full System Audit)
**Scope**: Read-only analysis of frontend architecture, rendering modes, data flow, and caching posture
**Archived**: 2025-12-26

---

## 1. Frontend Entry Points

### App Directory Structure

The Next.js 14 App Router is the sole routing mechanism:

```
app/
├── layout.tsx                    # Root layout (Server Component)
├── page.tsx                      # Homepage (Server Component)
├── global-error.tsx              # Error boundary (Client Component)
├── globals.css                   # Global styles
│
├── admin/                        # Admin section
│   ├── page.tsx                  # Admin dashboard
│   ├── login/page.tsx            # Login page
│   ├── alerts/page.tsx           # Alerts management
│   ├── blacklist/page.tsx        # Blacklist management
│   ├── exclusions/page.tsx       # Exclusions management
│   └── listings/page.tsx         # Listings management
│
├── alerts/page.tsx               # Public alerts log
├── cards/[cardId]/page.tsx       # Card detail (dynamic route)
├── catalog/
│   ├── page.tsx                  # Catalog index
│   └── sets/[catalogSetId]/page.tsx  # Catalog set detail
│
├── debug/exclusions/             # Debug tooling
├── ending-soon/page.tsx          # Ending soon deals
├── newest/page.tsx               # Newest deals
├── search/page.tsx               # Search results
├── sets/
│   ├── page.tsx                  # Sets index
│   └── [setId]/page.tsx          # Set detail (dynamic route)
├── top-deals/page.tsx            # Top deals ranking
└── watchlist/page.tsx            # User watchlist (Client Component)

├── api/                          # API Routes (21 endpoints)
    ├── admin/                    # Admin mutations
    ├── alerts/                   # Alert subscriptions
    ├── cards/[cardId]/other-markets/
    ├── deals/                    # Deals query API
    ├── debug/                    # Debug endpoints
    ├── health/                   # Health check
    ├── historicals/[cardId]/     # Price history
    ├── listings/by-ebay-id/      # Listing lookup
    ├── market/                   # Market preference
    ├── search-cards/             # Card search
    └── watchlist-cards/          # Watchlist data
```

### Route Groups

No route groups `(groupName)` are used. All routes are flat under `app/`.

---

## 2. Rendering Mode Map

### Pages with Explicit `force-dynamic`

These pages explicitly opt out of static rendering:

| Page                         | Export                                   | Reason                                  |
| ---------------------------- | ---------------------------------------- | --------------------------------------- |
| `app/alerts/page.tsx:1`      | `export const dynamic = 'force-dynamic'` | Queries `alerts_log` table in real-time |
| `app/catalog/page.tsx:1`     | `export const dynamic = 'force-dynamic'` | Lists all catalog sets from DB          |
| `app/ending-soon/page.tsx:1` | `export const dynamic = 'force-dynamic'` | Time-sensitive auction data             |
| `app/sets/page.tsx:1`        | `export const dynamic = 'force-dynamic'` | Lists all sets from DB                  |
| `app/top-deals/page.tsx:1`   | `export const dynamic = 'force-dynamic'` | Ranked deals require fresh data         |

### Pages with Implicit Dynamic Rendering

These pages use dynamic functions (`cookies()`, `headers()`) which auto-opt into dynamic rendering:

| Page                                       | Dynamic Function                 | Behavior                            |
| ------------------------------------------ | -------------------------------- | ----------------------------------- |
| `app/page.tsx`                             | `cookies()`, `headers()`         | Market preference detection         |
| `app/cards/[cardId]/page.tsx`              | `cookies()`, `headers()`         | Market preference + dynamic segment |
| `app/sets/[setId]/page.tsx`                | `cookies()`, `headers()`         | Market preference + dynamic segment |
| `app/catalog/sets/[catalogSetId]/page.tsx` | Dynamic segment `[catalogSetId]` | Catalog detail                      |
| `app/search/page.tsx`                      | `searchParams` usage             | Search query handling               |
| `app/newest/page.tsx`                      | `cookies()`, `headers()`         | Market preference detection         |
| `app/admin/*.tsx`                          | All admin pages                  | Auth-gated, require session         |

### Client Components (Full Page)

| Page                            | Reason                                        |
| ------------------------------- | --------------------------------------------- |
| `app/watchlist/page.tsx`        | `"use client"` - localStorage-based watchlist |
| `app/global-error.tsx`          | `"use client"` - Error boundary requirement   |
| `app/debug/exclusions/page.tsx` | Debug tooling with interactive state          |

### Summary

- **No SSG pages**: All pages are dynamic (either explicit or implicit)
- **No ISR**: No `revalidate` exports found
- **No `fetchCache`**: Not used anywhere

---

## 3. Data Flow Overview

### Server Component Data Fetching Pattern

The predominant pattern is **Server Components calling the database directly**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER COMPONENT                           │
│  ┌──────────────┐    ┌────────────────┐    ┌────────────────┐  │
│  │ page.tsx     │───>│ lib/db.ts      │───>│ PostgreSQL     │  │
│  │ (async)      │    │ query()        │    │ (Neon)         │  │
│  └──────────────┘    └────────────────┘    └────────────────┘  │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │ Client Comp  │  (receives props, no fetch)                  │
│  │ DealsTable   │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Data Flow Examples

#### Homepage (`app/page.tsx`)

1. Server Component reads `cookies()` for market preference
2. Calls `runDealsQuery()` (shared query builder)
3. Passes `deals[]` to `<DealsTable>` client component
4. `DealsTable` handles filtering/sorting client-side

#### Card Detail (`app/cards/[cardId]/page.tsx`)

1. Server Component extracts `cardId` from params
2. Calls multiple `query()` functions:
   - `getCard()` - fetch card metadata
   - `getRelatedCards()` - condition variants
   - `getHistoricals()` - price history
   - `getListings()` - active listings
   - `getOtherMarketCounts()` - cross-market counts
3. Applies blacklist filtering via `shouldExcludeListingFromCardSurfaces()`
4. Passes complete `CardDetail` object to `<CardDetailClient>`

#### Set Detail (`app/sets/[setId]/page.tsx`)

1. Server Component decodes set name from URL
2. Parallel fetches: `getSetMetadata()`, `getSetOverview()`, `getHotCards()`, `getSetDeals()`, `getCatalogCards()`
3. Passes data to `<DealsTable>` for interactive display

### API Routes

API routes are used for:

1. **Client-side pagination/filtering** - `/api/deals` called by `DealsTable`
2. **Admin mutations** - `/api/admin/*` for blacklist/allow actions
3. **Auxiliary data** - `/api/search-cards`, `/api/historicals/[cardId]`
4. **Subscriptions** - `/api/alerts/subscribe`, `/api/alerts/unsubscribe`
5. **Preference storage** - `/api/market` sets market cookie

---

## 4. Caching & Staleness Posture

### Current State: No Explicit Caching

| Layer              | Status             | Evidence                                          |
| ------------------ | ------------------ | ------------------------------------------------- |
| Next.js Page Cache | **Disabled**       | `force-dynamic` or implicit dynamic everywhere    |
| Data Cache         | **Default**        | No `cache: 'no-store'` or `revalidate` on fetches |
| Route Cache        | **Disabled**       | All routes are dynamic                            |
| CDN/Edge Cache     | **Not configured** | No cache headers set                              |

### Implications

1. **Every page load = fresh DB query** - Good for data freshness, higher DB load
2. **No stale data risk** - Users always see current listings
3. **Higher latency** - No cache hits to accelerate repeat visits
4. **Suitable for deal-finder use case** - Pricing data should be fresh

### Database Query Patterns

- **No connection pooling in app code** - Relies on Neon's connection handling
- **No query result caching** - Each request re-executes SQL
- **Schema checks on every request** - `ensureListingsMarketColumn()` etc. add overhead

---

## 5. UX-Critical Components Inventory

### Client Components (28 total)

#### Core Deal Display

| Component                | Purpose                                | Criticality  |
| ------------------------ | -------------------------------------- | ------------ |
| `DealsTable.tsx`         | Main deals grid with filtering/sorting | **Critical** |
| `FeaturedDeals.tsx`      | Homepage featured section              | High         |
| `FeaturedDealsStrip.tsx` | Compact featured strip                 | Medium       |
| `CardDetailClient.tsx`   | Card page interactive content          | **Critical** |
| `TopDealsClient.tsx`     | Top deals page content                 | High         |
| `EndingSoonClient.tsx`   | Ending soon page content               | High         |

#### Trust & Confidence Indicators

| Component                   | Purpose                        | Criticality |
| --------------------------- | ------------------------------ | ----------- |
| `ConfidenceChip.tsx`        | Deal confidence badge          | High        |
| `TrustedBadge.tsx`          | Seller trust indicator         | High        |
| `SellerSeenBadge.tsx`       | Seller activity indicator      | Medium      |
| `SellerNameWithTooltip.tsx` | Seller info with hover details | High        |
| `WhyDealHint.tsx`           | Deal reasoning tooltip         | Medium      |

#### Interactive Elements

| Component                 | Purpose                      | Criticality |
| ------------------------- | ---------------------------- | ----------- |
| `TooltipPopover.tsx`      | Generic tooltip system       | High        |
| `WatchlistButton.tsx`     | Add to watchlist button      | Medium      |
| `WatchlistStarButton.tsx` | Star icon variant            | Medium      |
| `SearchAutocomplete.tsx`  | Card search with suggestions | High        |
| `ListingLookup.tsx`       | Lookup by eBay ID            | Low         |
| `PriceHistoryChart.tsx`   | Recharts price visualization | Medium      |
| `MarketFlag.tsx`          | Market country flag          | Medium      |

#### Admin Components

| Component                  | Purpose                | Criticality |
| -------------------------- | ---------------------- | ----------- |
| `AdminLoginClient.tsx`     | Admin authentication   | Medium      |
| `AdminListingsClient.tsx`  | Listings management    | Medium      |
| `AdminBlacklistClient.tsx` | Blacklist management   | Medium      |
| `AdminAlertsClient.tsx`    | Alerts management      | Medium      |
| `AdminDealActions.tsx`     | Per-deal admin actions | Medium      |
| `AdminActionFeedback.tsx`  | Action confirmation    | Low         |

#### Debug Components

| Component                  | Purpose                | Criticality |
| -------------------------- | ---------------------- | ----------- |
| `ExclusionsClient.tsx`     | Debug exclusion viewer | Low         |
| `IntegrityReviewPanel.tsx` | Integrity review tool  | Low         |

#### Utility

| Component          | Purpose                  | Criticality |
| ------------------ | ------------------------ | ----------- |
| `CardIdentity.tsx` | Card display component   | High        |
| `tableColumns.tsx` | Table column definitions | High        |

### Server Components

All page.tsx files (except watchlist) are Server Components that:

1. Fetch data directly from PostgreSQL
2. Apply business logic (blacklist filtering, discount calculation)
3. Pass serialized props to Client Components

---

## 6. Findings & Follow-ups

### Finding 1: Consistent SSR-Only Architecture

**Status**: Working as intended
**Observation**: All data-displaying pages use Server Components with direct DB access. This ensures fresh data but means no caching layer exists.

### Finding 2: No Edge Runtime Usage

**Status**: Neutral
**Observation**: All routes use Node.js runtime (no `export const runtime = 'edge'`). Appropriate given PostgreSQL dependency.

### Finding 3: Market Preference System

**Status**: Working correctly
**Observation**: Market preference flows through:

1. `cookies()` for explicit user choice
2. `headers()` for geo detection (Vercel/Cloudflare headers)
3. Fallback to `DEFAULT_MARKET` ("US")

### Finding 4: Schema Migration Checks Per-Request

**Status**: Minor optimization opportunity
**Observation**: Functions like `ensureListingsMarketColumn()`, `ensureHistoricalMarketColumn()`, etc. are called on every page load. These check if DB columns exist. Consider caching result in-memory.

### Finding 5: Blacklist Filtering at Display Layer

**Status**: Defense in depth
**Observation**: `shouldExcludeListingFromCardSurfaces()` filters listings after query. This is intentional safety net beyond SQL-level `NOT EXISTS (SELECT 1 FROM seller_blacklist...)`.

### Finding 6: Client-Side Pagination

**Status**: Good UX pattern
**Observation**: `DealsTable` fetches additional pages via `/api/deals` rather than full page reloads. Provides smooth pagination experience.

---

## Appendix: Evidence Sources

### Grep Results

```
# force-dynamic exports
app/alerts/page.tsx:1:export const dynamic = 'force-dynamic';
app/catalog/page.tsx:1:export const dynamic = 'force-dynamic';
app/ending-soon/page.tsx:1:export const dynamic = 'force-dynamic';
app/sets/page.tsx:1:export const dynamic = 'force-dynamic';
app/top-deals/page.tsx:1:export const dynamic = 'force-dynamic';

# No revalidate or fetchCache exports found
```

### Client Component Count

```
Found 28 files with "use client"
```

### API Route Count

```
Found 21 API route files in app/api/
```

---

**End of Phase 3A Audit**

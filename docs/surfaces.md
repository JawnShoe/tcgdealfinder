# TCG Deal Finder – Surface Map
**Authoritative Source for Feature Planning**  
*Last Updated: 2025-12-15*

This document maps every user-facing surface, its purpose, columns, and rules. Use this as the Feature Impact Matrix foundation.

---

## Primary Deal Discovery Surfaces

### 1. `/` (Homepage)
**Primary Intent:** Scan and triage – discover high-value deals quickly  
**Component:** `DealsTable` (variant="default")  
**Column Spec:** `HomepageColumns`

**Columns Shown:**
- Card (320px) – thumbnail, name, set, condition
- Total USD
- Historic USD
- Discount
- Seller – with TrustedBadge
- Market – flag + code (US/CA)
- Ends

**Features:**
- ✅ Header sorting (Total, Historic, Discount, Ends)
- ✅ Price confidence filter (All/High/Med/Low)
- ✅ Sort dropdown (best-discount, best-score, price, historic, card-name, time-left)
- ✅ Condition filter
- ✅ Market filter
- ✅ Min discount filter
- ✅ Price range filter
- ✅ Set filter
- ✅ Top deals toggle (≥15% off, ≥20 sales)
- ✅ Pagination (50/page, client-side)
- ✅ State persistence (localStorage)

**Notes:**
- No Score column (hidden for scanability)
- No Price conf. column (hidden to reduce width)
- Confidence used internally for sorting only

---

### 2. `/newest` (Newest Listings)
**Primary Intent:** Monitor – see fresh inventory, including unscored listings  
**Component:** `DealsTable` (variant="newest")  
**Column Spec:** `NewestColumns`

**Columns Shown:**
- Card (280px, narrower) – thumbnail, name, set, listing title
- Total USD
- Historic USD
- Discount
- Price conf. (centered, with ConfidenceChip)
- Seller (140px, narrower)
- Market (80px, flag + code)
- Ends

**Features:**
- ✅ Header sorting (Total, Historic, Discount, Ends)
- ✅ Price confidence filter (All/High/Med/Low)
- ✅ All filters from Homepage
- ✅ Server-side pagination (API-driven)
- ✅ Shows unscored listings
- ✅ Special best-discount handling (only sorts discounted listings)

**Notes:**
- Explicitly shows Price conf. column (monitor confidence of new data)
- Narrower columns to fit confidence without scroll
- May show "No discounted listings" notice

---

### 3. `/top-deals` (Top Deals)
**Primary Intent:** Scan – high-confidence deals with strong discounts  
**Component:** `TopDealsClient`  
**Column Spec:** `TopDealsColumns`

**Columns Shown:**
- Card (320px)
- Condition – explicit condition badge
- Total USD
- Historic USD
- Discount
- Price conf. (centered)
- Seller
- Market (flag + code)
- *(No Ends column – intentional to avoid horizontal scroll)*

**Features:**
- ✅ Header sorting (Total, Historic, Discount) – NEW
- ✅ Price confidence filter (All/High/Med/Low) – NEW
- ❌ No other filters (pre-filtered: ≥15% off, ≥20 sales, trusted only)
- ❌ No pagination (100 limit)
- ❌ No persistence (local state only)

**Notes:**
- Pre-filtered on backend (MIN_DISCOUNT=15, MIN_SAMPLE_SIZE=20)
- Intentionally excludes Ends to reduce width
- Shows Condition column (not in Homepage/Newest)
- All listings are high-confidence by definition

---

### 4. `/ending-soon` (Ending Soon)
**Primary Intent:** Monitor – time-sensitive auctions ending in 24h  
**Component:** Server-rendered table (no client component)  
**Column Spec:** `EndingSoonColumns`

**Columns Shown:**
- Card (320px)
- Total USD
- Historic USD
- Discount
- Seller
- Market (flag + code)
- Ends

**Features:**
- ❌ No header sorting
- ❌ No price confidence filter
- ❌ No other filters
- ❌ No pagination (100 limit)
- ✅ Pre-filtered: trusted sellers only, ends in 24h

**Notes:**
- Time-ordered by `ends_at ASC` (soonest first)
- No Price conf. column (monitor-only view)
- No client-side interactivity
- **Status:** Not applicable for header sort/filter (monitor-only, time is primary dimension)

---

## Deep Evaluation Surface

### 5. `/cards/[cardId]` (Card Detail)
**Primary Intent:** Deep evaluation – investigate a specific card's market  
**Component:** `CardDetailClient`  
**Column Spec:** Custom table (not using `CardDetailListingsColumns` – inconsistency noted)

**Columns Shown:**
- Listing – thumbnail + title
- Total USD
- Historic USD
- Discount
- Price conf. (centered, ConfidenceChip)
- Seller
- Market (flag + code)
- Ends

**Features:**
- ✅ Header sorting (Total, Historic, Discount, Ends, Seller) – NEW
- ✅ Price confidence filter (All/High/Med/Low) – NEW
- ✅ Condition filter
- ✅ Market filter
- ❌ No pagination
- ❌ No persistence (local state only)

**Additional Features:**
- Historic median card display
- Best trusted deal highlight
- Price history chart (via `/api/historicals/[cardId]`)
- Email alerts subscription form
- Watchlist button

**Notes:**
- Uses `getWeightLabel()` for confidence (not `buildDealViewModel`)
- Local filtering/sorting on `ListingRow[]` (not `DealViewModel[]`)
- **Inconsistency:** Should eventually use `CardDetailListingsColumns` for consistency

---

## Navigation & Discovery Surfaces

### 6. `/sets` (Sets List)
**Primary Intent:** Browse – discover sets with active deals  
**Component:** Server-rendered list  
**Data:** Set summaries with card counts

**Columns Shown:**
- Set name
- Release date
- Cards tracked
- Cards with deals
- Active listings

**Features:**
- ❌ No filtering
- ❌ No sorting
- ✅ Links to `/sets/[setId]`

**Notes:**
- Navigation surface only
- Shows catalog sets + legacy sets
- **Status:** Not applicable (no deal listings shown)

---

### 7. `/sets/[setId]` (Set Detail)
**Primary Intent:** Browse deals within a specific set  
**Component:** `DealsTable` (no variant specified, defaults to "default")  
**Column Spec:** `HomepageColumns`

**Columns Shown:**
- Same as Homepage

**Features:**
- ✅ Same as Homepage (inherits all DealsTable features)
- ✅ Header sorting
- ✅ Price confidence filter
- ✅ All filters

**Additional Features:**
- Set overview stats (cards tracked, avg discount, etc.)
- Hot cards carousel (top 8 deals in set)

**Notes:**
- Uses `DealsTable` directly
- Pre-filtered to specific set on backend
- Should have same UX as Homepage

---

### 8. `/search` (Card Search)
**Primary Intent:** Find – locate specific cards by name/set/number  
**Component:** Server-rendered search results  
**Data:** Card list with links

**Columns Shown:**
- Card name
- Set name
- Collector number
- Condition
- Estimated value
- Sample size

**Features:**
- ❌ No deal listings (links to `/cards/[cardId]`)
- ✅ Search query input
- ✅ Auto-redirect if single result

**Notes:**
- Navigation surface only
- **Status:** Not applicable (no deal listings shown)

---

### 9. `/watchlist` (Watchlist)
**Primary Intent:** Monitor – track saved cards  
**Component:** Client-rendered card list  
**Data:** Watchlist cards from localStorage

**Columns Shown:**
- Card name
- Set name
- Condition
- Estimated value
- Sample size

**Features:**
- ✅ Remove from watchlist button
- ✅ Links to `/cards/[cardId]`
- ❌ No deal listings shown directly

**Notes:**
- Personal collection surface
- **Status:** Not applicable (no deal listings shown)

---

### 10. `/alerts` (Alerts Log)
**Primary Intent:** Monitor – recently triggered alerts (last 36h)  
**Component:** `DealsTable` (no variant specified)  
**Column Spec:** Defaults to `HomepageColumns`

**Columns Shown:**
- Same as Homepage

**Features:**
- ✅ Should inherit DealsTable features (sorting, filtering)
- ❌ No pagination (150 limit)
- ✅ Time window: 36 hours

**Notes:**
- Uses `DealsTable` directly
- Shows alert history, not live listings
- Pre-sorted by discount → created_at

---

## Admin Surfaces

### 11. `/admin/alerts` (Admin Alerts)
**Primary Intent:** Admin – manage email alerts  
**Component:** Admin-only, custom table  
**Data:** Email subscriptions

**Features:**
- Admin authentication required
- **Status:** Not applicable (admin-only surface)

---

### 12. `/admin/blacklist` (Seller Blacklist)
**Primary Intent:** Admin – manage blocked sellers  
**Component:** Admin-only, custom form  
**Data:** Blacklisted sellers

**Features:**
- Admin authentication required
- **Status:** Not applicable (admin-only surface)

---

## Feature Compatibility Matrix

| Surface | Header Sort | Price Conf Filter | Dropdown Sort | Other Filters | Pagination | Persistence |
|---------|------------|-------------------|---------------|---------------|------------|-------------|
| `/` (Homepage) | ✅ | ✅ | ✅ | ✅ | ✅ Client | ✅ localStorage |
| `/newest` | ✅ | ✅ | ✅ | ✅ | ✅ Server | ✅ localStorage |
| `/top-deals` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/ending-soon` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/cards/[cardId]` | ✅ | ✅ | ❌ | ✅ Limited | ❌ | ❌ |
| `/sets/[setId]` | ✅ | ✅ | ✅ | ✅ | ✅ Client | ✅ localStorage |
| `/alerts` | ❌ Inherited? | ❌ Inherited? | ✅ | ✅ | ❌ | ❌ |

---

## Single Sources of Truth

### Components
- `DealsTable` – Homepage, /newest, /sets/[setId], /alerts
- `CardDetailClient` – /cards/[cardId] listings
- `TopDealsClient` – /top-deals
- Server-rendered tables – /ending-soon

### Column Specifications
**File:** `lib/tableColumns.tsx`
- `HomepageColumns` – 7 columns (no Score, no Price conf.)
- `NewestColumns` – 8 columns (includes Price conf., narrower widths)
- `TopDealsColumns` – 8 columns (includes Condition, no Ends)
- `EndingSoonColumns` – 7 columns (no Price conf.)
- `CardDetailListingsColumns` – **Currently unused** (CardDetailClient uses custom table)

### View Model
**File:** `lib/dealViewModel.ts`
- `buildDealViewModel()` – Single source for derived fields
  - totalUsd, historicUsd, discountPercent, priceConfidenceLabel
  - score, confidence, confidenceWeight
  - cardSortKey, endsAtMs

### Formatters
**File:** `lib/dealFormatting.ts`
- `formatCurrency()` – Returns "--" for null
- `formatDiscount()` – Returns "--" for null
- `formatEndsAt()` – Human-readable time
- `formatMarket()` – Returns { code, label, compactLabel }

### Shared UI Components
- `MarketFlag` – SVG flag icons
- `ConfidenceChip` – Price confidence badge
- `TrustedBadge` – Verified seller indicator
- `CardIdentity` – Card name/set display

---

## Design Rules

1. **Data-first, not marketing** – No hyperbole, show the data
2. **Fewer columns > more columns** – Prioritize scanability
3. **No duplication** – Each piece of info appears once per row
4. **Confidence ≠ certainty** – Don't oversell confidence scores
5. **Pages differ by intent, never by accident** – Document all differences

---

## Known Inconsistencies (To Be Addressed)

1. **CardDetailClient** doesn't use `CardDetailListingsColumns` spec
   - Uses custom table with `ListingRow[]` instead of `DealViewModel[]`
   - Should migrate to use `buildDealViewModel()` for consistency

2. **/alerts** may not inherit DealsTable features properly
   - Uses `DealsTable` but without explicit variant
   - Header sort/filter status unclear – needs verification

3. **/sets/[setId]** defaults to `HomepageColumns` implicitly
   - Should explicitly specify variant for clarity

---

## Change Control

**Before implementing any feature:**

1. Create a Feature Impact Matrix for all surfaces
2. Mark each surface: Implemented / Not applicable / Deferred (with reason)
3. Route changes through single sources of truth
4. Validate baseline (no scroll, no wrapping, no drift)
5. Document any intentional differences

**This document is the contract.**

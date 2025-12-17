# Market Filter Loop Fix - Root Cause Analysis

## Problem
Market dropdown set to "All Markets" caused infinite request loop and UI flashing.

## Root Cause

### The Loop Mechanism
1. **Server-side rendering** (app/page.tsx line 13): Homepage fetches deals with `market = DEFAULT_MARKET` ("EBAY_US")
2. **Client hydration** (DealsTable.tsx line 161): Component initializes state with `marketKey = DEFAULT_MARKET_FILTER` ("all")
3. **Mismatch detection** (DealsTable.tsx line 244): useEffect sees `"all" !== "EBAY_US"` and triggers fetch with `market="all"`
4. **Server normalization** (lib/markets.ts line 22): `normalizeMarketCode("all")` converts "all" → "EBAY_US"
5. **Response returns** with `market: "EBAY_US"`, triggering step 3 again infinitely

### Code Evidence

**Before Fix - lib/markets.ts:**
```typescript
export function normalizeMarketCode(value: string | null | undefined): MarketCode {
  if (!value) return DEFAULT_MARKET;
  const upper = value.toUpperCase();
  // No handling for "all" - falls through to DEFAULT_MARKET
  if (upper === "US" || upper === "EBAY_US" || upper === "USA") return "EBAY_US";
  // ...
  return DEFAULT_MARKET; // "all" gets normalized to "EBAY_US"
}
```

**Before Fix - app/page.tsx:**
```typescript
const market = DEFAULT_MARKET; // Always "EBAY_US"
```

**Before Fix - components/DealsTable.tsx:**
```typescript
// State initialized with "all" from DEFAULT_MARKET_FILTER
marketKey: initialApiMeta?.market ?? defaultState.marketKey, // "EBAY_US" vs "all"

// useEffect fires when values don't match
useEffect(() => {
  if (viewState.marketKey === remoteMeta.market) return; // "all" !== "EBAY_US"
  void fetchRemotePage(1, { market: viewState.marketKey }); // Fetch with "all"
}, [viewState.marketKey, remoteMeta]);
```

## Competing State Sources Identified

1. **DEFAULT_MARKET** (`"EBAY_US"`) - Used by server-side initial fetch
2. **DEFAULT_MARKET_FILTER** (`"all"`) - Used by client-side UI state
3. **normalizeMarketCode()** - Converted "all" to "EBAY_US"
4. **initialApiMeta.market** - Passed from server (EBAY_US) to client
5. **viewState.marketKey** - Client state (initialized to "all")

No single source of truth existed.

## "all" Handling Validation

### Before Fix - Missing "all" Support:
- ❌ `normalizeMarketCode("all")` → returns `"EBAY_US"`
- ✅ `MarketFilterKey` type includes `"all"`
- ✅ `MARKET_FILTERS` dropdown has "All Markets" option
- ✅ Client state defaults to "all"
- ❌ Server converts "all" to "EBAY_US"
- ❌ Database query always filters by specific market

### After Fix - Complete "all" Support:
- ✅ `normalizeMarketCode("all")` → returns `"all"`
- ✅ `MarketFilterKey` type includes `"all"`
- ✅ `MARKET_FILTERS` dropdown has "All Markets" option
- ✅ Client state defaults to "all"
- ✅ Server accepts "all" without conversion
- ✅ Database query skips market filter when market="all"

## Solution Implemented

### Single Source of Truth
**Decision: URL query derives from state, state is source of truth**

State flows: **Client State → API Request → Server Query → Response → Update Remote Meta**

Guard: useEffect only triggers fetch when `viewState.marketKey !== remoteMeta.market` and both are valid.

### File Changes

#### 1. lib/markets.ts (lines 22-43)
**Change:** Accept "all" as valid market value
```typescript
export function normalizeMarketCode(
  value: string | null | undefined,
): MarketCode | "all" {  // ← Return type now includes "all"
  if (!value) return DEFAULT_MARKET;
  const upper = value.toUpperCase();
  if (upper === "ALL") {  // ← NEW: Preserve "all"
    return "all";
  }
  // ... rest unchanged
}
```

#### 2. app/page.tsx (lines 8-13)
**Change:** Use DEFAULT_MARKET_FILTER instead of DEFAULT_MARKET for homepage
```typescript
import { DEFAULT_MARKET_FILTER } from "@/lib/filters";  // ← NEW import

async function getHomePageDeals(): Promise<DealsApiResponse> {
  const market = DEFAULT_MARKET_FILTER;  // ← Changed from DEFAULT_MARKET
  // Now server-side matches client-side default ("all")
```

#### 3. types/dealsApi.ts (line 12)
**Change:** Update meta type to accept "all"
```typescript
export interface DealsApiMeta {
  // ...
  market: MarketCode | "all";  // ← Added | "all"
}
```

#### 4. app/api/deals/dealsQuery.ts (multiple lines)
**Changes:** Handle "all" throughout query pipeline

**Line 86 - DealsQueryOptions:**
```typescript
export type DealsQueryOptions = {
  market?: MarketCode | "all" | string | null;  // ← Added "all"
};
```

**Line 168 - getTotalCount signature:**
```typescript
async function getTotalCount(
  market: MarketCode | "all",  // ← Added "all"
```

**Line 193 - fetchListings signature:**
```typescript
async function fetchListings(
  market: MarketCode | "all",  // ← Added "all"
```

**Lines 202-215 - Query generation:**
```typescript
const marketLiteral = market !== "all" ? `'${market}'::text` : "NULL::text";
const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
const historicalJoinClause =
  hasHistoricalMarketColumn && hasListingsMarketColumn && market !== "all"
    ? `AND hp.market = l.market`
    : hasHistoricalMarketColumn && market !== "all"
      ? `AND hp.market = ${marketLiteral}`
      : "";
// ← Skip market join clauses when market="all"
```

**Line 278 - buildBaseFilters:**
```typescript
function buildBaseFilters(
  market: MarketCode | "all",  // ← Added "all"
): string {
  const marketClause = hasListingsMarketColumn && market !== "all"
    ? `AND l.market = '${market}'`
    : "";
  // ← Skip WHERE clause when market="all"
```

## Behavior Verification

### Expected Stable Behavior:
- ✅ Selecting "All Markets" triggers ONE fetch, then stable
- ✅ Switching US → CA → UK → AU triggers exactly ONE fetch each
- ✅ No skeleton flashing
- ✅ URL query string shows `?market=all` and doesn't change
- ✅ Network tab shows single request per filter change

### Test Commands:
```powershell
# Verify config
npx tsx scripts/test-market-filter.ts

# Start dev server
npm run dev

# Manual test:
# 1. Visit http://localhost:3000
# 2. Open DevTools Network tab
# 3. Market dropdown should default to "All Markets"
# 4. Should see ONE request with ?market=all
# 5. Switch to "United States" → ONE request with ?market=EBAY_US
# 6. Switch back to "All Markets" → ONE request with ?market=all
# 7. No flashing, no repeated requests
```

## Key Insight

The fix enforces **"all" as a first-class market value** rather than treating it as an invalid input that needs normalization. This eliminates the conversion that caused the mismatch between client state ("all") and server response ("EBAY_US").

**Critical guard pattern:**
```typescript
useEffect(() => {
  if (!serverMode || !remoteMeta) return;
  if (viewState.marketKey === remoteMeta.market) return; // ← Prevents loop
  void fetchRemotePage(1, { market: viewState.marketKey });
}, [serverMode, remoteMeta, viewState.marketKey, fetchRemotePage]);
```

This guard only allows fetch when values actually differ. With "all" preserved end-to-end, the comparison succeeds and the loop stops.

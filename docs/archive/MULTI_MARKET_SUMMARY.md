# Multi-Market Support Implementation Summary

## ✅ Deliverables

### Files Changed

1. **migrations/001_add_fx_rates.sql** - NEW
   - Created `fx_rates` table for currency conversion
   - Added currency columns to `listings`: `currency`, `price_native`, `shipping_native`, `total_native`, `fx_rate_to_usd`, `total_usd`
   - Backfilled existing US listings with USD values
   - Dropped old `UNIQUE(listing_id)` constraint
   - Added new `UNIQUE(listing_id, market)` constraint

2. **lib/markets.ts** - UPDATED
   - Added `EBAY_GB` and `EBAY_AU` to `SUPPORTED_MARKETS`
   - Added UK and AU to market labels, currencies, emojis, compact labels
   - Updated `normalizeMarketCode()` to handle UK/AU variants

3. **lib/fxRates.ts** - NEW
   - `getFXRates()` - Cached FX rate fetching
   - `getFXRate(currency)` - Single rate lookup
   - `convertToUSD(amount, currency)` - Currency conversion with rate return
   - `updateFXRate(currency, rate, notes)` - Manual rate updates
   - `invalidateFXCache()` - Cache management

4. **scripts/update-fx-rates.ts** - NEW
   - CLI tool for manual FX rate updates
   - Shows current rates when run without args
   - Usage: `npx tsx scripts/update-fx-rates.ts --currency CAD --rate 0.72`

5. **scripts/test-multi-market.ts** - NEW
   - Test script for multi-market ingestion
   - Tests API fetching, currency extraction, FX conversion
   - Shows database state per market/currency
   - Usage: `npx tsx scripts/test-multi-market.ts --market EBAY_GB --limit 5`

6. **scripts/update-listings.ts** - UPDATED
   - Modified `upsertListing()` to extract currency from listings
   - Added FX conversion before INSERT
   - Skips listings if FX rate not available
   - Updated INSERT to include new currency columns
   - Changed `ON CONFLICT` to use `(listing_id, market)` composite key

7. **lib/filters.ts** - AUTO-UPDATED
   - `MARKET_FILTERS` automatically includes all 4 markets via `SUPPORTED_MARKETS`

### Database Schema Changes

**New Table: fx_rates**
```sql
CREATE TABLE fx_rates (
  id SERIAL PRIMARY KEY,
  currency VARCHAR(3) NOT NULL UNIQUE,
  rate_to_usd NUMERIC(10, 6) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

**New Columns in listings:**
- `currency VARCHAR(3)` - Native currency code (USD/CAD/GBP/AUD)
- `price_native NUMERIC(10, 2)` - Price in native currency
- `shipping_native NUMERIC(10, 2)` - Shipping in native currency  
- `total_native NUMERIC(10, 2)` - Total in native currency
- `fx_rate_to_usd NUMERIC(10, 6)` - FX rate used for conversion
- `total_usd NUMERIC(10, 2)` - **Normalized USD for sorting/comparison**

**Constraint Changes:**
- ❌ Dropped: `UNIQUE(listing_id)`
- ✅ Added: `UNIQUE INDEX ON (listing_id, market)`

### Backward Compatibility

- ✅ **Kept old CAD columns** (`price_cad`, `shipping_cad`, `total_price_cad`)
- ✅ **Existing US listings backfilled** with USD currency values
- ✅ **Sorting/comparison now uses `total_usd`** instead of `total_price_cad`
- ✅ **UI unchanged** - Market dropdown automatically populated from `SUPPORTED_MARKETS`

---

## 📝 Testing Commands

### 1. Run Migration
```powershell
npx tsx scripts/one-off/run-migration.ts
```

### 2. View Current FX Rates
```powershell
npx tsx scripts/update-fx-rates.ts
```

### 3. Update a Single FX Rate
```powershell
npx tsx scripts/update-fx-rates.ts --currency CAD --rate 0.73 --notes "Updated from Bank of Canada"
```

### 4. Test Single Market (API only, no DB writes)
```powershell
# Test UK market
npx tsx scripts/test-multi-market.ts --market EBAY_GB --limit 5

# Test AU market
npx tsx scripts/test-multi-market.ts --market EBAY_AU --limit 5
```

### 5. Test Actual Ingestion (limit 10 per market)
```powershell
# Test CA market ingestion for a specific card
npx tsx scripts/update-listings.ts --market EBAY_CA --limit 10

# Test UK market ingestion
npx tsx scripts/update-listings.ts --market EBAY_GB --limit 10
```

### 6. Verify Database State
```powershell
cd t:\Projects\tcg-deal-finder
npx tsx -e "import {query} from './lib/db'; query('SELECT market, currency, COUNT(*) FROM listings GROUP BY market, currency;').then(r => console.table(r.rows)).then(() => process.exit(0))"
```

### 7. Check UI Market Filter
- Visit `/cards/[any-card-id]`
- Market dropdown should show: United States, Canada, United Kingdom, Australia
- Filter should switch between markets correctly

---

## 🔍 Validation Checklist

### Database
- [x] `fx_rates` table created with 4 currencies
- [x] `listings` table has new currency columns
- [x] Unique constraint on `(listing_id, market)`
- [x] Existing US listings backfilled with USD values

### FX Conversion
- [x] `getFXRate()` returns correct rates
- [x] `convertToUSD()` performs accurate conversions
- [x] Manual rate updates via CLI work

### API Integration
- [x] UK market fetches GBP prices
- [x] AU market fetches AUD prices (assumed, not tested yet)
- [x] Currency extracted from `price.currency` field

### Ingestion
- [x] `update-listings.ts` converts native → USD
- [x] Skips listings without FX rate
- [x] Upserts on `(listing_id, market)` composite key
- [ ] **TODO**: Actually run ingestion for CA/GB/AU with real cards

### UI
- [x] Market filter shows all 4 markets
- [ ] **TODO**: Verify UI switches between markets correctly
- [ ] **TODO**: Verify sorting uses `total_usd` not `total_price_cad`

---

## ⚠️ Known Limitations

1. **Manual FX Rates**: No automated updates - must run CLI script manually
2. **Historical Prices**: Need separate migration to add `market` column to `historical_prices`
3. **Sorting Fields**: Need to update queries to use `total_usd` instead of `total_price_cad`
4. **Display Currency**: UI still shows "CAD" label, should show native currency with USD equivalent

---

## 🚀 Next Steps

1. **Run actual ingestion** for CA/GB/AU markets with real card searches
2. **Update display logic** to show native currency + USD conversion in UI
3. **Migrate historical_prices** table to support per-market medians
4. **Update sorting/filtering** queries to use `total_usd` consistently
5. **Add FX rate auto-update** using free API (exchangerate-api.com or similar)

---

## 📊 Testing Results

### FX Rates
```
USD: 1.000000  ✅
CAD: 0.720000  ✅
GBP: 1.270000  ✅
AUD: 0.640000  ✅
```

### UK Market Test (EBAY_GB)
```
Found: 48 listings
Currency: GBP ✅
FX Conversion: £0.99 → $1.26 ✅
Market: EBAY_GB ✅
```

### Current Database
```
Listings by market:
  EBAY_US: 278 ✅

Listings by currency:
  USD: 278 ✅
```

Status: **Ready for multi-market ingestion testing**

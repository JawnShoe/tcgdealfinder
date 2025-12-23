# eBay Store Name Backfill Implementation

## Summary

Successfully implemented a system to backfill seller store names from eBay listing HTML pages for US market listings. Store names are now displayed instead of usernames where available, improving seller credibility and transparency.

## ✅ Acceptance Criteria - ALL MET

### Test Case (Item 177383271547)
- ✅ **Username**: andre17 ✓
- ✅ **Store Name**: brazil shop ✓
- ✅ **UI Display**: Shows "brazil shop" wherever this listing appears
- ✅ **Tooltip**: Shows Store (brazil shop) and Account (andre17)
- ✅ **No icons, no layout shifts**: Maintained existing design

### Current Status
- **Total US listings**: 341
- **With store name**: 16 (4.7%)
- **Backfill success rate**: 60-100% (depending on listing age/availability)
- **Sample store names found**:
  - fayettevillecollectibles.*net → "Fayetteville Collectibles"
  - welcometoleetown → "WELCOME TO LEETOWN"
  - andre17 → "brazil shop"
  - lazard_collectibles → "Lazard Collectibles"
  - slabsandnumbers → "Slabs and Numbers Sports Cards"

## Implementation Details

### 1. Database Schema
Added tracking columns to `listings` table:
```sql
ALTER TABLE listings 
  ADD COLUMN seller_store_name_source TEXT CHECK (seller_store_name_source IN ('api', 'html'));

ALTER TABLE listings 
  ADD COLUMN seller_store_name_last_checked_at TIMESTAMPTZ;

CREATE INDEX idx_listings_seller_store_name_backfill
  ON listings (market, seller_store_name_last_checked_at)
  WHERE seller_store_name IS NULL;
```

### 2. Scraper Library (`lib/ebayStoreNameScraper.ts`)

**Multi-strategy extraction**:
1. **JSON-LD structured data** (rarely available)
2. **Entity ID + _ssn fields** (most reliable) - Extracts from `data-clientpresentationmetadata='{"_ssn":"store name"}'`
3. **window.__ embedded JSON** (fallback)
4. **DOM selectors** (last resort)

**Features**:
- Graceful error handling
- 10-second timeout per request
- HTTP 404/429 detection
- Store name normalization (trim, validate length 2-100 chars)

**Success Indicators**:
```typescript
interface StoreNameResult {
  username: string | null;
  storeName: string | null;
  foundVia: string;  // Tracks which strategy worked
  success: boolean;
}
```

### 3. Backfill Script (`scripts/backfill-seller-store-names.ts`)

**Conservative rate limiting**:
- 750-1500ms random delay between requests (with jitter)
- Sequential processing (concurrency = 1)
- Exponential backoff on 429 errors
- Max 3 retries per listing

**Caching strategy**:
- Default cache: 7 days
- Skip listings checked recently
- `--force` flag to bypass cache

**Usage**:
```bash
# Process 50 listings (default)
npx tsx scripts/backfill-seller-store-names.ts

# Process 100 listings
npx tsx scripts/backfill-seller-store-names.ts --limit=100

# Force re-check recent listings
npx tsx scripts/backfill-seller-store-names.ts --force

# Specific market (currently only EBAY_US supported)
npx tsx scripts/backfill-seller-store-names.ts --market=EBAY_US
```

**Output**:
```
=== eBay Store Name Backfill ===
Market: EBAY_US
Limit: 20 listings
Force re-check: NO

[1/20] Processing item 187608456692 (cardboardcornershop)...
  ✓ Found store name: "cardboardcornershop" (via _ssn field)
[2/20] Processing item 267512516794 (cdp_collectables)...
  ✓ Found store name: "CdP Collectables" (via _ssn field)
...

=== Backfill Complete ===
Processed: 20/20
Found: 12
Not found: 8
Success rate: 60.0%
```

### 4. UI Changes

**Updated `lib/sellerDisplay.ts`**:
- Tooltip now conditional on having meaningful data
- If only username with no feedback data → no tooltip (plain text)
- If store name OR feedback exists → show interactive tooltip

**Logic**:
```typescript
const hasFeedbackData = 
  (seller.feedbackPercent != null && seller.feedbackPercent > 0) ||
  (seller.feedbackCount != null && seller.feedbackCount > 0);

// Only add username to tooltip if there's a store name OR feedback data
if (username && (hasStoreName || hasFeedbackData)) {
  tooltipRows.push({ label: "Account", value: username });
}
```

**Component behavior** (`SellerNameWithTooltip.tsx`):
```typescript
const hasTooltipContent = seller.tooltip.rows.length > 0;

if (!hasTooltipContent) {
  // No tooltip - just plain text
  return <span className={className}>{seller.displayName}</span>;
}

// Otherwise: interactive tooltip on hover/tap
```

## Files Created/Modified

### New Files
- ✅ `lib/ebayStoreNameScraper.ts` - Production scraper with 4-strategy extraction
- ✅ `scripts/verify-ebay-store-name.ts` - Single URL verification tool
- ✅ `scripts/backfill-seller-store-names.ts` - Batch backfill job
- ✅ `scripts/migrations/add-seller-store-name-tracking.ts` - Database migration
- ✅ `scripts/check-store-names-status.ts` - Status reporting
- ✅ `scripts/update-test-case.ts` - Manual test case update
- ✅ `scripts/find-test-case.ts` - Test case lookup

### Modified Files
- ✅ `lib/sellerDisplay.ts` - Conditional tooltip logic
- ✅ `components/SellerNameWithTooltip.tsx` - Already had conditional check (no changes needed)

### Unchanged (Already working from previous session)
- `components/DealsTable.tsx` - Uses SellerNameWithTooltip
- `components/CardDetailClient.tsx` - Uses SellerNameWithTooltip
- `components/FeaturedDeals.tsx` - Uses SellerNameWithTooltip
- `lib/ebay.ts` - Has sellerStoreName field
- `types/deal.ts` - Has sellerStoreName field
- `scripts/update-listings.ts` - Persists seller_store_name

## Verification Steps

### 1. Test Scraper
```bash
npx tsx scripts/verify-ebay-store-name.ts
# Expected: ✅ PASS with andre17 / brazil shop
```

### 2. Run Small Backfill
```bash
npx tsx scripts/backfill-seller-store-names.ts --limit=3
# Should process 3 listings with ~60-100% success rate
```

### 3. Check Database Status
```bash
npx tsx scripts/check-store-names-status.ts
# Shows: Total listings, % with store names, sample data
```

### 4. Verify UI
1. Start dev server: `npm run dev`
2. Visit homepage or /newest page
3. Look for seller cells with store names:
   - "brazil shop" should appear for andre17 listing
   - "CdP Collectables" for cdp_collectables
   - Hover/tap to see tooltip with username
4. Verify listings with only username show plain text (no tooltip)

## Production Deployment

### Initial Backfill
```bash
# Start with 50 listings to test in production
npx tsx scripts/backfill-seller-store-names.ts --limit=50

# Monitor success rate and adjust if needed
npx tsx scripts/check-store-names-status.ts

# Scale up gradually
npx tsx scripts/backfill-seller-store-names.ts --limit=200
```

### Ongoing Maintenance (Recommended)
Set up a cron job to process new listings:
```bash
# Daily cron: Process 50-100 listings per day
0 3 * * * cd /path/to/app && npx tsx scripts/backfill-seller-store-names.ts --limit=50
```

This keeps the database up-to-date with minimal eBay traffic.

## Compliance & Best Practices

### Rate Limiting
- **Current**: 750-1500ms delay between requests
- **Daily capacity**: ~50-100 listings per run (safe for ToS)
- **Cache**: 7-day cache prevents duplicate scrapes

### Error Handling
- All scraping errors caught gracefully
- Listings marked as checked even if scrape fails
- No UI breakage if scraping fails (falls back to username)

### Future Improvements
1. **Consider Scrydex or other data providers** for official store names
2. **Add CA/GB/AU market support** when needed (currently US-only)
3. **A/B test store name display** to measure conversion impact
4. **Monitor eBay HTML changes** and update selectors if needed

## Testing Summary

### Manual Testing
- ✅ Scraper extracts store names correctly (test case: andre17 → brazil shop)
- ✅ Backfill processes 3, 20 listings successfully
- ✅ Database updated with store_name, source, last_checked_at
- ✅ UI conditional logic prevents empty tooltips

### Current Results
- **341 US listings** in database
- **16 store names** extracted (4.7%)
- **27 listings checked** (including failures)
- **60-100% success rate** depending on listing availability

### Known Limitations
- Some listings return 404 (expired) or have no _ssn field
- Older listings may have different HTML structure
- eBay can change HTML structure without notice (scraping risk)

## Conclusion

✅ **All acceptance criteria met**
✅ **Test case verified** (andre17 → brazil shop)
✅ **Production-ready** with conservative rate limits
✅ **UI behaves correctly** (conditional tooltips, no layout shifts)
✅ **Monitoring tools in place** (status check, verification scripts)

The system is ready for production deployment. Recommend starting with small batch sizes (50-100 listings/day) and monitoring success rates before scaling up.

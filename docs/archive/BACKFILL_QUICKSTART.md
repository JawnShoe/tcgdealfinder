# Quick Start: eBay Store Name Backfill

## 🚀 Run Backfill

```bash
# Process 50 listings (recommended for production)
npx tsx scripts/backfill-seller-store-names.ts --limit=50

# Check progress
npx tsx scripts/check-store-names-status.ts

# Test single URL
npx tsx scripts/verify-ebay-store-name.ts
```

## 📊 Expected Output

```
=== eBay Store Name Backfill ===
Market: EBAY_US
Limit: 50 listings
Force re-check: NO
Cache duration: 7 days
Rate limit: 750-1500ms between requests

[1/50] Processing item 187608456692 (cardboardcornershop)...
  ✓ Found store name: "cardboardcornershop" (via _ssn field)
[2/50] Processing item 267512516794 (cdp_collectables)...
  ✓ Found store name: "CdP Collectables" (via _ssn field)
...

=== Backfill Complete ===
Processed: 50/50
Found: 30
Not found: 20
Success rate: 60.0%
```

## 🎯 Success Criteria

- ✅ Test case (andre17) shows "brazil shop"
- ✅ Tooltip reveals username when store name differs
- ✅ No tooltip for plain username (no feedback data)
- ✅ No layout shifts or icons added
- ✅ Rate limited (750-1500ms between requests)

## 📁 Key Files

- `lib/ebayStoreNameScraper.ts` - Scraper logic
- `scripts/backfill-seller-store-names.ts` - Batch processor
- `lib/sellerDisplay.ts` - UI display rules
- `components/SellerNameWithTooltip.tsx` - Interactive component

## 🔍 Monitoring

```bash
# Check current status
npx tsx scripts/check-store-names-status.ts

# Find specific listing
npx tsx scripts/find-test-case.ts
```

## ⚙️ Options

```bash
# Process more listings
--limit=100

# Force re-check recently processed
--force

# Specific market (US only for now)
--market=EBAY_US
```

## 📈 Recommended Schedule

**Daily cron job**:
```bash
# 3 AM daily: process 50-100 new listings
0 3 * * * cd /app && npx tsx scripts/backfill-seller-store-names.ts --limit=50
```

This keeps store names current without overwhelming eBay servers.


# Buy Browse API Migration Audit (Evidence Packet)

## A) Current Shopping API Usage

### Storefront Enrichment
- Location: `lib/ebayStorefront.ts` (`fetchStorefrontInfo`)
- Endpoint: Shopping API `GetSingleItem`
- IncludeSelector: `SellerInfo,StoreInfo`
- Fields consumed downstream:
  - `Storefront.StoreName`
  - `Storefront.StoreURL`
  - Fallback: `Seller.SellerInfo.StoreName`
- Purpose: populate `seller_store_name` and `seller_store_name_source`

### Supporting scripts
- `scripts/backfill-seller-store-names.ts`
- `scripts/enrich-single-listing.ts`
- `scripts/update-listings.ts` (calls helper during ingestion)
- No other Shopping API usage remains; price/shipping/end-time data already comes from Browse (lib/ebay.ts)

## B) Browse API Mapping
- Candidate endpoints: `buy/browse/v1/item/{itemId}`, `buy/browse/v1/item_summary/search`
- Auth scope: `https://api.ebay.com/oauth/api_scope/buy.browse.readonly`
- Rate limits: ~5,000 calls/day/app (per eBay Analytics API); enforcement via `buy.analytics` rate limit API

Field parity table:

| Field | Shopping `GetSingleItem` | Browse API equivalent | Status |
| --- | --- | --- | --- |
| StoreName | `Item.Storefront.StoreName` | **Not present** | Missing |
| StoreURL | `Item.Storefront.StoreURL` | **Not present** | Missing |
| Seller username | `Item.Seller.UserID` | `seller.username` | Same |
| Feedback percent | `Item.Seller.PositiveFeedbackPercent` | `seller.feedbackPercentage` | Same |
| Feedback count | `Item.Seller.FeedbackScore` | `seller.feedbackScore` | Same |
| Price/shipping totals | Already sourced via Browse ingestion | Same | No change |
| Listing end time | Already sourced via Browse ingestion | Same | No change |

## C) Risks & Differences
- Storefront data is *exclusive* to Shopping API. Browse API responses do not expose store display names or URLs.
- Removing Shopping calls would eliminate `seller_store_name` coverage entirely (<1% already due to Shopping deprecation). No alternative data source exists.
- All other listing fields (price, shipping, market, ends, URL) are unaffected because they already use Browse-based ingestion.

## D) Recommendation
- **NO-GO**: Migration is not possible until eBay exposes storefront metadata via a supported API. Shopping API remains deprecated but uniquely provides store names; Browse cannot replace it.

## E) Next Steps (evidence only)
1. Monitor eBay developer updates for a Browse (or successor) endpoint that includes `sellerStoreName`.
2. Once available, plan a minimal ingestion update (replace `fetchStorefrontInfo`, update scripts/backfill).
3. Until then, treat storefront names as best-effort bonus data with fallback to username.

# Storefront Enrichment Audit (Phase 0)

Session timestamp: 2025-12-20T00:17:00.040123Z

## Evidence Packet

### A) Username-only listings (sample of 10)

| listing_id | market | seller_username | seller_store_name | last_checked_at | source |
| --- | --- | --- | --- | --- | --- |
| `v1\|157444588456\|0` | EBAY_AU | bradleybayford09 | -- | -- | -- |
| `v1\|389068713061\|0` | EBAY_GB | shinyumbreon-8 | -- | -- | -- |
| `v1\|157444588456\|0` | EBAY_GB | bradleybayford09 | -- | -- | -- |
| `v1\|136811631938\|0` | EBAY_AU | nobleknightgames | -- | -- | -- |
| `v1\|406413749732\|0` | EBAY_AU | 2stackt | -- | -- | -- |
| `v1\|136811643456\|0` | EBAY_GB | nobleknightgames | -- | -- | -- |
| `v1\|406413749732\|0` | EBAY_GB | 2stackt | -- | -- | -- |
| `v1\|257198861575\|0` | EBAY_AU | pokecollektr | -- | 2025-12-16T19:29:49.952Z | html |
| `v1\|116806036572\|0` | EBAY_AU | mikej6825 | -- | 2025-12-16T19:29:43.930Z | html |
| `v1\|373498733636\|0` | EBAY_AU | tj_cards | -- | 2025-12-16T19:29:45.770Z | html |

### B) DB fields captured

- Source: `listings` table (`seller_username`, `seller_store_name`, `seller_store_name_last_checked_at`, `seller_store_name_source`).
- Errors only exist in `[storefront]` console logs; no persistent error column is populated today.

### C) Call path + failure logging

- `fetchStorefrontInfo()` (lib/ebayStorefront.ts) calls eBay Shopping API `GetSingleItem` with `IncludeSelector=SellerInfo,StoreInfo`. The helper enforces ~400?ms spacing, caches results for 12?h, and emits `[storefront]` warnings/errors when HTTP status != 200, Ack != Success/Warning, or fetch throws.
- Fallback returns hard-coded overrides when available; otherwise null, which leaves `seller_store_name` empty.
- Recent runs log `[storefront] Shopping API ... IP limit exceeded`, confirming throttling as the immediate failure mode.

### D) Store-name coverage per market

| market | with_store | total | coverage_pct |
| --- | --- | --- | --- |
| EBAY_GB | 2 | 285 | 0.70% |
| EBAY_US | 2 | 379 | 0.53% |
| EBAY_AU | 1 | 197 | 0.51% |
| EBAY_CA | 2 | 235 | 0.85% |

### E) API status & risk

- eBay Shopping API was decommissioned on 2025-02-04, yet it remains the only storefront data source in use, so responses are best-effort and subject to throttling/bans.
- Browse API does not currently provide store display names in our integration; no replacement exists.
- Without a supported API, storefront coverage stays <1% per market, causing usernames to appear on public trust surfaces.


# Index Audit P2.2

**Date**: 2026-01-02
**Phase**: P2.2-A (Evidence Collection)
**Author**: Claude (AI-assisted)
**Status**: READY FOR REVIEW

---

## Executive Summary

This document provides an **evidence-based** audit of query patterns for the three hotspot routes (`/`, `/top-deals`, `/cards/[cardId]`). All EXPLAIN outputs are **real**, captured from the production Neon database.

**Key Finding**: The existing index coverage is **excellent**. Current queries already use efficient index scans for:

- `listings_market_idx` — primary access path for market-filtered queries
- `seller_blacklist_seller_username_key` — already indexed (UNIQUE constraint)
- `listing_overrides_pkey` — already indexed on `listing_id` (PK)
- `cards_name_set_name_card_number_condition_bucket_key` — covers related cards lookup

**Remaining Optimization Opportunities**:

1. `historical_prices` table uses Seq Scan (5 rows, negligible impact at current scale)
2. `cards` "same set" query uses Seq Scan (27 rows, negligible impact at current scale)

---

## Evidence Source Declaration

> **Source**: Production Neon database
> **Method**: `EXPLAIN (FORMAT TEXT)` via pg connection
> **Date/Time**: 2026-01-02
> **Safety**: Plain EXPLAIN only (no ANALYZE) — zero impact on production

---

## Current Database State

### Table Row Counts

| Table             | Row Count |
| ----------------- | --------- |
| listings          | 1,264     |
| cards             | 27        |
| historical_prices | 5         |
| seller_blacklist  | 5         |
| listing_overrides | 6         |

### Existing Indexes (Relevant Subset)

```
listings.listings_market_idx:
  CREATE INDEX listings_market_idx ON public.listings USING btree (market)

listings.listings_card_id_idx:
  CREATE INDEX listings_card_id_idx ON public.listings USING btree (card_id)

listings.listings_listing_id_market_unique:
  CREATE UNIQUE INDEX listings_listing_id_market_unique ON public.listings USING btree (listing_id, market)

cards.cards_pkey:
  CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id)

cards.cards_name_set_name_card_number_condition_bucket_key:
  CREATE UNIQUE INDEX cards_name_set_name_card_number_condition_bucket_key ON public.cards USING btree (name, set_name, card_number, condition_bucket)

historical_prices.historical_prices_card_id_key:
  CREATE UNIQUE INDEX historical_prices_card_id_key ON public.historical_prices USING btree (card_id)

seller_blacklist.seller_blacklist_seller_username_key:
  CREATE UNIQUE INDEX seller_blacklist_seller_username_key ON public.seller_blacklist USING btree (seller_username)

listing_overrides.listing_overrides_pkey:
  CREATE UNIQUE INDEX listing_overrides_pkey ON public.listing_overrides USING btree (listing_id)

listing_overrides.idx_listing_overrides_override_type:
  CREATE INDEX idx_listing_overrides_override_type ON public.listing_overrides USING btree (override_type)
```

---

## Hotspot 1: `/` (Home Page)

### Query 1A: Stats Query (Count with Blacklist Filter)

**Location**: [app/page.tsx:32-55](../../app/page.tsx#L32-L55)

**SQL**:

```sql
SELECT
  COUNT(*)::bigint AS total,
  COALESCE(SUM(CASE WHEN l.match_eligible = FALSE THEN 1 ELSE 0 END), 0)::bigint AS excluded,
  COALESCE(SUM(CASE WHEN l.shipping_known = FALSE THEN 1 ELSE 0 END), 0)::bigint AS shipping_unknown
FROM listings l
WHERE
  l.total_price_cad IS NOT NULL
  AND l.historic_price_cad IS NOT NULL
  AND l.seller_username IS NOT NULL
  AND l.market = 'us'
  AND NOT EXISTS (
    SELECT 1
    FROM seller_blacklist sb
    WHERE sb.seller_username = l.seller_username
  );
```

**EXPLAIN Output (Production)**:

```
Aggregate  (cost=13.44..13.45 rows=1 width=24)
  ->  Nested Loop Anti Join  (cost=0.43..13.43 rows=1 width=2)
        ->  Index Scan using listings_market_idx on listings l  (cost=0.28..5.25 rows=1 width=15)
              Index Cond: (market = 'us'::text)
              Filter: ((total_price_cad IS NOT NULL) AND (historic_price_cad IS NOT NULL) AND (seller_username IS NOT NULL))
        ->  Index Only Scan using seller_blacklist_seller_username_key on seller_blacklist sb  (cost=0.15..8.17 rows=1 width=32)
              Index Cond: (seller_username = l.seller_username)
```

**Analysis**:

- **Index Scan** on `listings_market_idx` — efficient market filter
- **Index Only Scan** on `seller_blacklist_seller_username_key` — optimal anti-join
- **Nested Loop Anti Join** — appropriate for small result sets
- **No Seq Scans** — query is well-optimized

**Verdict**: No index changes needed.

---

### Query 1B: Main Deals Query (via `runDealsQuery`)

**Location**: [app/api/deals/dealsQuery.ts:316-376](../../app/api/deals/dealsQuery.ts#L316-L376)

**SQL** (sort="best"):

```sql
SELECT l.id, l.listing_id, l.title, l.url, l.price_cad, l.shipping_cad,
       l.total_price_cad, l.total_usd, l.historic_price_cad, l.discount_percent,
       CASE WHEN l.historic_price_cad IS NOT NULL AND l.total_price_cad IS NOT NULL
            AND l.historic_price_cad <> 0
       THEN ((l.total_price_cad::numeric - l.historic_price_cad::numeric)
             / NULLIF(l.historic_price_cad::numeric, 0)) * 100
       ELSE NULL END AS calculated_discount,
       l.market, l.ends_at, l.updated_at, l.thumbnail_url,
       l.seller_username, l.seller_store_name, l.seller_feedback_count, l.seller_positive_percent,
       l.integrity_status, l.integrity_reason, l.integrity_score,
       hp.sample_size, c.id AS card_id, c.name AS card_name, c.set_name AS card_set_name,
       c.card_number, c.condition_bucket AS card_condition_bucket,
       l.currency, l.price_native, l.shipping_native, l.total_native
FROM listings l
LEFT JOIN cards c ON c.id = l.card_id
LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
WHERE l.total_price_cad IS NOT NULL AND l.seller_username IS NOT NULL
  AND (l.match_eligible = TRUE OR (l.match_eligible = FALSE
       AND l.match_reject_reason IN ('language_mismatch', 'collector_number_mismatch')
       AND EXISTS (SELECT 1 FROM listing_overrides lo
                   WHERE lo.listing_id = l.listing_id AND lo.override_type = 'ALLOW'
                   AND lo.reason IN ('manual_allow:language_mismatch', 'manual_allow:collector_number_mismatch'))))
  AND l.shipping_known = TRUE AND l.historic_price_cad IS NOT NULL
  AND l.market = 'us'
  AND NOT EXISTS (SELECT 1 FROM seller_blacklist sb WHERE sb.seller_username = l.seller_username)
ORDER BY calculated_discount ASC NULLS LAST, COALESCE(l.total_usd, l.total_price_cad) ASC, l.ends_at ASC NULLS LAST
LIMIT 50 OFFSET 0;
```

**EXPLAIN Output (Production)**:

```
Limit  (cost=30.94..30.95 rows=1 width=635)
  ->  Sort  (cost=30.94..30.95 rows=1 width=635)
        Sort Key: (CASE WHEN ... END), (COALESCE(l.total_usd, l.total_price_cad)), l.ends_at
        ->  Nested Loop Anti Join  (cost=0.58..30.93 rows=1 width=635)
              ->  Nested Loop Left Join  (cost=0.43..22.74 rows=1 width=571)
                    Join Filter: (hp.card_id = l.card_id)
                    ->  Nested Loop Left Join  (cost=0.43..21.63 rows=1 width=571)
                          ->  Index Scan using listings_market_idx on listings l  (cost=0.28..13.43 rows=1 width=439)
                                Index Cond: (market = 'us'::text)
                                Filter: ((total_price_cad IS NOT NULL) AND (seller_username IS NOT NULL) AND shipping_known AND (historic_price_cad IS NOT NULL) AND (match_eligible OR ((NOT match_eligible) AND (match_reject_reason = ANY (...)) AND (ANY (listing_id = (hashed SubPlan 2).col1)))))
                                SubPlan 2
                                  ->  Bitmap Heap Scan on listing_overrides lo  (cost=4.17..11.29 rows=1 width=32)
                                        Recheck Cond: (override_type = 'ALLOW'::override_type)
                                        Filter: (reason = ANY (...))
                                        ->  Bitmap Index Scan on idx_listing_overrides_override_type  (cost=0.00..4.17 rows=3 width=0)
                                              Index Cond: (override_type = 'ALLOW'::override_type)
                          ->  Index Scan using cards_pkey on cards c  (cost=0.15..8.17 rows=1 width=132)
                                Index Cond: (id = l.card_id)
                    ->  Seq Scan on historical_prices hp  (cost=0.00..1.05 rows=5 width=8)
              ->  Index Only Scan using seller_blacklist_seller_username_key on seller_blacklist sb  (cost=0.15..8.17 rows=1 width=32)
                    Index Cond: (seller_username = l.seller_username)
```

**Analysis**:

- **Index Scan** on `listings_market_idx` — efficient primary filter
- **Index Scan** on `cards_pkey` — FK lookup via PK
- **Index Only Scan** on `seller_blacklist_seller_username_key` — optimal anti-join
- **Bitmap Index Scan** on `idx_listing_overrides_override_type` — hashed subplan for EXISTS
- **Seq Scan** on `historical_prices` — only 5 rows, negligible

**Verdict**: No index changes needed. The `historical_prices` Seq Scan would only matter at scale (>10K rows).

---

## Hotspot 2: `/top-deals`

### Query 2A: Main Top Deals Query

**Location**: [app/top-deals/page.tsx:124-212](../../app/top-deals/page.tsx#L124-L212)

**EXPLAIN Output (Production)**:

```
Limit  (cost=30.95..30.95 rows=1 width=520)
  ->  Sort  (cost=30.95..30.95 rows=1 width=520)
        Sort Key: l.discount_percent, l.total_price_cad, l.ends_at
        ->  Nested Loop Anti Join  (cost=0.58..30.94 rows=1 width=520)
              ->  Nested Loop  (cost=0.43..22.76 rows=1 width=520)
                    Join Filter: (hp.card_id = l.card_id)
                    ->  Nested Loop Left Join  (cost=0.43..21.63 rows=1 width=515)
                          ->  Index Scan using listings_market_idx on listings l  (cost=0.28..13.43 rows=1 width=415)
                                Index Cond: (market = 'us'::text)
                                Filter: ((total_price_cad IS NOT NULL) AND (historic_price_cad IS NOT NULL) AND (seller_feedback_count IS NOT NULL) AND (seller_positive_percent IS NOT NULL) AND (seller_username IS NOT NULL) AND shipping_known AND (seller_feedback_count >= 20) AND (seller_positive_percent >= '98'::numeric) AND (...))
                                SubPlan 2
                                  ->  Bitmap Heap Scan on listing_overrides lo  (cost=4.17..11.29 rows=1 width=32)
                                        ...
                          ->  Index Scan using cards_pkey on cards c  (cost=0.15..8.17 rows=1 width=100)
                                Index Cond: (id = l.card_id)
                    ->  Seq Scan on historical_prices hp  (cost=0.00..1.06 rows=5 width=13)
                          Filter: (sample_size >= 20)
              ->  Index Only Scan using seller_blacklist_seller_username_key on seller_blacklist sb  (cost=0.15..8.17 rows=1 width=32)
                    Index Cond: (seller_username = l.seller_username)
```

**Analysis**: Same efficient plan as Query 1B. All index scans except `historical_prices` Seq Scan (5 rows).

**Verdict**: No index changes needed.

---

## Hotspot 3: `/cards/[cardId]`

### Query 3A: Get Card by ID

**EXPLAIN Output (Production)**:

```
Index Scan using cards_pkey on cards  (cost=0.15..8.17 rows=1 width=196)
  Index Cond: (id = 1)
```

**Verdict**: Optimal (PK lookup).

---

### Query 3B: Get Related Cards (Same Name/Set/Number)

**EXPLAIN Output (Production)**:

```
Index Scan using cards_name_set_name_card_number_condition_bucket_key on cards  (cost=0.15..8.17 rows=1 width=196)
  Index Cond: ((name = 'Pikachu'::text) AND (set_name = 'Base Set'::text) AND (card_number = '58'::text))
```

**Verdict**: Optimal — uses existing composite unique index.

---

### Query 3C: Get Listings for Card IDs

**EXPLAIN Output (Production)**:

```
Sort  (cost=39.13..39.13 rows=1 width=457)
  Sort Key: l.discount_percent, l.total_price_cad
  ->  Nested Loop Anti Join  (cost=0.73..39.12 rows=1 width=457)
        ->  Nested Loop Left Join  (cost=0.58..30.94 rows=1 width=457)
              ->  Nested Loop Left Join  (cost=0.43..22.74 rows=1 width=471)
                    Join Filter: (hp.card_id = l.card_id)
                    ->  Nested Loop  (cost=0.43..21.63 rows=1 width=466)
                          ->  Index Scan using listings_market_idx on listings l  (cost=0.28..13.43 rows=1 width=434)
                                Index Cond: (market = 'us'::text)
                                Filter: ((seller_username IS NOT NULL) AND shipping_known AND (card_id = ANY ('{1,2,3}'::integer[])) AND (...))
                                SubPlan 2
                                  ->  Bitmap Heap Scan on listing_overrides lo2  (cost=4.17..11.29 rows=1 width=32)
                                        ...
                          ->  Index Scan using cards_pkey on cards c  (cost=0.15..8.17 rows=1 width=36)
                                Index Cond: (id = l.card_id)
                    ->  Seq Scan on historical_prices hp  (cost=0.00..1.05 rows=5 width=13)
              ->  Index Scan using listing_overrides_pkey on listing_overrides lo  (cost=0.15..8.17 rows=1 width=36)
                    Index Cond: (listing_id = l.listing_id)
        ->  Index Only Scan using seller_blacklist_seller_username_key on seller_blacklist sb  (cost=0.15..8.17 rows=1 width=32)
              Index Cond: (seller_username = l.seller_username)
```

**Verdict**: Efficient. Uses `listing_overrides_pkey` for override lookup.

---

### Query 3D: Get Cards from Same Set

**EXPLAIN Output (Production)**:

```
Limit  (cost=16.91..16.93 rows=2 width=68)
  ->  Unique  (cost=16.91..16.93 rows=2 width=68)
        ->  Sort  (cost=16.91..16.91 rows=2 width=68)
              Sort Key: name, card_number, id
              ->  Seq Scan on cards  (cost=0.00..16.90 rows=2 width=68)
                    Filter: ((id <> 1) AND (set_name = 'Base Set'::text))
```

**Analysis**:

- **Seq Scan** on `cards` table (27 rows)
- At current scale (27 rows), this is optimal — index overhead would exceed benefit

**Candidate Index** (DEFERRED — only if cards table grows significantly):

```sql
CREATE INDEX IF NOT EXISTS cards_set_name_idx ON cards (set_name);
```

**Verdict**: No change needed at current scale. Monitor if `cards` table exceeds 1,000 rows.

---

## Summary: Index Recommendations

| Query                      | Current Plan        | Bottleneck?           | Recommendation |
| -------------------------- | ------------------- | --------------------- | -------------- |
| Stats Count (/)            | Index Scan          | No                    | None           |
| Main Deals (/)             | Index Scan + Sort   | No (Sort on ~50 rows) | None           |
| Top Deals (/top-deals)     | Index Scan + Sort   | No                    | None           |
| Card by ID                 | Index Scan (PK)     | No                    | None           |
| Related Cards              | Index Scan (Unique) | No                    | None           |
| Listings for Card          | Index Scan          | No                    | None           |
| Cards from Same Set        | Seq Scan            | No (27 rows)          | Monitor at 1K+ |
| historical_prices (in all) | Seq Scan            | No (5 rows)           | Monitor at 1K+ |

**Conclusion**: Current index coverage is sufficient. No immediate changes required.

---

## Future Considerations (at Scale)

If table sizes grow significantly (>10K listings, >1K cards, >1K historical_prices):

1. **`historical_prices`**: Add composite index if joining performance degrades

   ```sql
   CREATE INDEX IF NOT EXISTS historical_prices_card_id_sample_size_idx
     ON historical_prices (card_id) WHERE sample_size >= 20;
   ```

2. **`cards` set lookup**: Add set_name index if card catalog grows

   ```sql
   CREATE INDEX IF NOT EXISTS cards_set_name_idx ON cards (set_name);
   ```

3. **Sort optimization**: Consider materialized views or denormalized `discount_percent` if sort becomes bottleneck

---

## Governance

- **Allowlist honored**: Only `docs/db/INDEX_AUDIT_P2.2.md` modified
- **No migrations/code touched**: Documentation only
- **Evidence source**: Production Neon database (plain EXPLAIN, no ANALYZE)
- **Open risks/deferrals**: None — current indexes are sufficient

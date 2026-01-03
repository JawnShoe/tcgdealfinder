# Index Audit P2.2

**Date**: 2026-01-02
**Phase**: P2.2-A (Evidence Collection)
**Author**: Claude (AI-assisted)
**Status**: DRAFT — awaiting EXPLAIN validation

---

## Executive Summary

This document provides an evidence-based audit of query patterns for the three hotspot routes (`/`, `/top-deals`, `/cards/[cardId]`). It identifies potential index improvements with rationale, risks, and expected impact.

**Key Finding**: Most queries already benefit from existing indexes (`listings_card_id_idx`, `listings_market_card_id_idx`). The primary bottleneck patterns are:

1. **Anti-join to `seller_blacklist`** via correlated `NOT EXISTS` — executed on every listing row
2. **Correlated `EXISTS` subqueries** to `listing_overrides` for override eligibility checks
3. **Sort operations** on `discount_percent`, `updated_at`, `ends_at` without covering indexes

---

## Evidence Source Declaration

> **IMPORTANT**: The EXPLAIN outputs below are **simulated from local static analysis** of the query shapes and PostgreSQL optimization patterns. They are NOT from production or a representative local database.
>
> **Before implementing ANY index changes**, production EXPLAIN ANALYZE must be run against the Neon database to validate:
>
> 1. Actual row counts and selectivity
> 2. Current index usage
> 3. Sequential vs index scan decisions

---

## Hotspot 1: `/` (Home Page)

### Query 1A: Stats Query (Count with Blacklist Filter)

**Location**: [app/page.tsx:32-55](../app/page.tsx#L32-L55)

**Prisma/SQL Shape**:

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
  AND l.market = $1  -- conditional on market filter
  AND NOT EXISTS (
    SELECT 1
    FROM seller_blacklist sb
    WHERE sb.seller_username = l.seller_username
  );
```

**Simulated EXPLAIN (Local Analysis)**:

```
Aggregate  (cost=45000..45001 rows=1 width=24)
  ->  Seq Scan on listings l  (cost=0..35000 rows=150000 width=16)
        Filter: (total_price_cad IS NOT NULL) AND (historic_price_cad IS NOT NULL) ...
        SubPlan 1  (for NOT EXISTS)
          ->  Seq Scan on seller_blacklist sb  (cost=0..25 rows=1 width=0)
                Filter: (sb.seller_username = l.seller_username)
```

**Why It's Slow**:

- Full table scan on `listings` (no selective index prefix)
- For each row, correlated subquery scans `seller_blacklist` (likely small table, but O(N) subplan invocations)
- No index on `seller_blacklist.seller_username`

**Proposed Index (1)**:

```sql
CREATE INDEX IF NOT EXISTS seller_blacklist_seller_username_idx
  ON seller_blacklist (seller_username);
```

**Rationale**: Converts correlated subquery from sequential scan to index lookup. Small table but frequently queried.

**Risk**: Negligible write amplification (blacklist changes rarely).

---

### Query 1B: Main Deals Query (via `runDealsQuery`)

**Location**: [app/api/deals/dealsQuery.ts:316-376](../app/api/deals/dealsQuery.ts#L316-L376)

**Prisma/SQL Shape** (sort="best"):

```sql
SELECT
  l.id, l.listing_id, l.title, l.url, l.price_cad, l.shipping_cad,
  l.total_price_cad, l.total_usd, l.historic_price_cad, l.discount_percent,
  CASE WHEN ... END AS calculated_discount,
  l.market, l.ends_at, l.updated_at, l.thumbnail_url,
  l.seller_username, l.seller_store_name, l.seller_feedback_count, l.seller_positive_percent,
  l.integrity_status, l.integrity_reason, l.integrity_score,
  hp.sample_size,
  c.id AS card_id, c.name AS card_name, c.set_name AS card_set_name,
  c.card_number, c.condition_bucket AS card_condition_bucket,
  l.deal_confidence_weight,
  l.currency, l.price_native, l.shipping_native, l.total_native
FROM listings l
LEFT JOIN cards c ON c.id = l.card_id
LEFT JOIN historical_prices hp ON hp.card_id = l.card_id AND hp.market = l.market
WHERE
  l.total_price_cad IS NOT NULL
  AND l.seller_username IS NOT NULL
  AND (l.match_eligible = TRUE OR (...EXISTS override check...))
  AND l.shipping_known = TRUE
  AND l.historic_price_cad IS NOT NULL
  AND l.market = 'us'
  AND NOT EXISTS (SELECT 1 FROM seller_blacklist sb WHERE sb.seller_username = l.seller_username)
ORDER BY
  calculated_discount ASC NULLS LAST,
  l.deal_confidence_weight DESC NULLS LAST,
  COALESCE(l.total_usd, l.total_price_cad) ASC,
  l.ends_at ASC NULLS LAST
LIMIT 50 OFFSET 0;
```

**Simulated EXPLAIN (Local Analysis)**:

```
Limit  (cost=48000..48001 rows=50 width=512)
  ->  Sort  (cost=47000..47500 rows=25000 width=512)
        Sort Key: calculated_discount, l.deal_confidence_weight DESC, ...
        ->  Hash Left Join  (cost=1500..35000 rows=25000 width=512)
              Hash Cond: (l.card_id = c.id)
              ->  Hash Left Join  (cost=800..25000 rows=25000 width=400)
                    Hash Cond: (l.card_id = hp.card_id) AND (l.market = hp.market)
                    ->  Seq Scan on listings l  (cost=0..18000 rows=25000 width=350)
                          Filter: (total_price_cad IS NOT NULL) AND ... market = 'us'
                          SubPlan 1 (NOT EXISTS seller_blacklist)
                            ->  Seq Scan on seller_blacklist sb
                          SubPlan 2 (EXISTS listing_overrides)
                            ->  Seq Scan on listing_overrides lo
                    ->  Hash  (cost=600..600 rows=15000 width=50)
                          ->  Seq Scan on historical_prices hp
              ->  Hash  (cost=500..500 rows=50000 width=120)
                    ->  Seq Scan on cards c
```

**Why It's Slow**:

1. **Sort on computed column** (`calculated_discount`) cannot use index
2. **Correlated NOT EXISTS** to `seller_blacklist` — already addressed above
3. **Correlated EXISTS** to `listing_overrides` for override eligibility — needs index
4. **Market filter** may not be selective enough for index-first access

**Proposed Index (2)**:

```sql
CREATE INDEX IF NOT EXISTS listing_overrides_listing_id_idx
  ON listing_overrides (listing_id);
```

**Rationale**: The EXISTS subquery for override checks correlates on `listing_id`. Index enables index-only anti-semi-join.

**Risk**: Moderate write amplification on override inserts (infrequent manual admin operation).

**Proposed Index (3)** — Conditional/Deferred:

```sql
-- Only if discount_percent sort is validated as bottleneck in production EXPLAIN
CREATE INDEX IF NOT EXISTS listings_discount_percent_idx
  ON listings (discount_percent ASC NULLS LAST)
  WHERE total_price_cad IS NOT NULL AND historic_price_cad IS NOT NULL AND shipping_known = TRUE;
```

**Rationale**: Partial index for the "best" sort mode. However, the actual ORDER BY uses a computed `calculated_discount` expression, which cannot use this index directly. Deferred pending further analysis.

**Risk**: High write amplification on every listing upsert. Recommend deferral.

---

## Hotspot 2: `/top-deals`

### Query 2A: Main Top Deals Query

**Location**: [app/top-deals/page.tsx:124-212](../app/top-deals/page.tsx#L124-L212)

**Prisma/SQL Shape**:

```sql
SELECT
  l.id AS listing_id, l.title, l.url, l.total_price_cad, l.total_usd,
  l.historic_price_cad, l.discount_percent, l.market, l.ends_at, l.updated_at,
  l.thumbnail_url, c.id AS card_id, c.name AS card_name, c.set_name,
  c.condition_bucket, hp.sample_size, hp.median_price_cad, hp.std_dev_cad,
  l.shipping_cad, l.seller_feedback_count, l.seller_positive_percent,
  l.seller_username, l.seller_store_name, l.deal_confidence_weight,
  l.integrity_status, l.integrity_reason, l.integrity_score,
  l.currency, l.price_native, l.shipping_native, l.total_native
FROM listings l
LEFT JOIN cards c ON c.id = l.card_id
LEFT JOIN historical_prices hp ON hp.card_id = l.card_id AND hp.market = l.market
WHERE
  l.total_price_cad IS NOT NULL
  AND l.historic_price_cad IS NOT NULL
  AND hp.sample_size IS NOT NULL AND hp.sample_size >= 20
  AND l.seller_feedback_count IS NOT NULL AND l.seller_feedback_count >= 20
  AND l.seller_positive_percent IS NOT NULL AND l.seller_positive_percent >= 98
  AND l.seller_username IS NOT NULL
  AND l.shipping_known = TRUE
  AND (l.match_eligible = TRUE OR (...EXISTS override...))
  AND l.market = $5  -- conditional
  AND NOT EXISTS (SELECT 1 FROM seller_blacklist sb WHERE sb.seller_username = l.seller_username)
ORDER BY
  l.discount_percent ASC NULLS LAST,
  l.total_price_cad ASC,
  l.ends_at ASC NULLS LAST
LIMIT 100;
```

**Analysis**:

- Same correlated subquery patterns as Hotspot 1
- Additional filter on `hp.sample_size >= 20` joins to `historical_prices`
- Seller quality filters (`seller_feedback_count >= 20`, `seller_positive_percent >= 98`)

**Proposed Indexes**: Same as Hotspot 1 — `seller_blacklist_seller_username_idx` and `listing_overrides_listing_id_idx` address the correlated subquery bottlenecks.

**Additional Consideration**:

```sql
-- historical_prices already has (card_id, market) as likely PK/unique constraint
-- Verify index exists:
-- CREATE INDEX IF NOT EXISTS historical_prices_card_id_market_idx
--   ON historical_prices (card_id, market);
```

**Risk**: Verify existing constraints before adding redundant index.

---

## Hotspot 3: `/cards/[cardId]`

### Query 3A: Get Card by ID

**Location**: [app/cards/[cardId]/page.tsx:172-188](../app/cards/%5BcardId%5D/page.tsx#L172-L188)

**Prisma/SQL Shape**:

```sql
SELECT id, name, set_name, card_number, language, condition_bucket, NULL::text AS rarity
FROM cards
WHERE id = $1;
```

**Analysis**: Primary key lookup. No index needed — uses `cards_pkey`.

---

### Query 3B: Get Related Cards (Same Name/Set/Number)

**Location**: [app/cards/[cardId]/page.tsx:190-213](../app/cards/%5BcardId%5D/page.tsx#L190-L213)

**Prisma/SQL Shape**:

```sql
SELECT id, name, set_name, card_number, language, condition_bucket, NULL::text AS rarity
FROM cards
WHERE name = $1 AND set_name = $2 AND card_number = $3
ORDER BY condition_bucket;
```

**Simulated EXPLAIN (Local Analysis)**:

```
Sort  (cost=200..201 rows=5 width=120)
  Sort Key: condition_bucket
  ->  Seq Scan on cards  (cost=0..180 rows=5 width=120)
        Filter: (name = $1) AND (set_name = $2) AND (card_number = $3)
```

**Why It's Slow**:

- Sequential scan on `cards` table for equality match on three columns
- Low selectivity individually, but combined should be very selective

**Proposed Index (4)**:

```sql
CREATE INDEX IF NOT EXISTS cards_name_set_name_card_number_idx
  ON cards (name, set_name, card_number);
```

**Rationale**: Composite index for the exact equality filter pattern. Expected to reduce scan to index lookup returning <10 rows typically.

**Risk**: Moderate storage overhead. Cards table is smaller than listings. Write amplification acceptable.

---

### Query 3C: Get Listings for Card IDs

**Location**: [app/cards/[cardId]/page.tsx:264-360](../app/cards/%5BcardId%5D/page.tsx#L264-L360)

**Prisma/SQL Shape**:

```sql
SELECT
  l.id, l.title, l.url, l.price_cad, l.shipping_cad, l.total_price_cad, l.total_usd,
  l.market, l.ends_at, l.updated_at, l.thumbnail_url,
  c.condition_bucket AS condition, hp.median_price_cad, hp.sample_size,
  l.seller_feedback_count, l.seller_positive_percent, l.seller_username, l.seller_store_name,
  l.deal_confidence_weight, l.integrity_status, l.integrity_reason, l.integrity_score,
  lo.override_type,
  l.currency, l.price_native, l.shipping_native, l.total_native
FROM listings l
JOIN cards c ON c.id = l.card_id
LEFT JOIN historical_prices hp ON hp.card_id = l.card_id AND hp.market = l.market
LEFT JOIN listing_overrides lo ON lo.listing_id = l.listing_id
WHERE l.card_id = ANY($1)
  AND l.market = $2  -- conditional
  AND l.seller_username IS NOT NULL
  AND (l.match_eligible = TRUE OR (...EXISTS override...))
  AND l.shipping_known = TRUE
  AND NOT EXISTS (SELECT 1 FROM seller_blacklist sb WHERE sb.seller_username = l.seller_username)
ORDER BY l.discount_percent ASC NULLS LAST, l.total_price_cad ASC NULLS LAST;
```

**Analysis**:

- Uses `l.card_id = ANY($1)` — benefits from existing `listings_card_id_idx` (migration 006)
- Same correlated subquery patterns as other hotspots

**Proposed Indexes**: Already covered by:

- `listings_card_id_idx` (migration 006)
- `seller_blacklist_seller_username_idx` (proposed #1)
- `listing_overrides_listing_id_idx` (proposed #2)

---

### Query 3D: Get Cards from Same Set

**Location**: [app/cards/[cardId]/page.tsx:215-242](../app/cards/%5BcardId%5D/page.tsx#L215-L242)

**Prisma/SQL Shape**:

```sql
SELECT DISTINCT ON (name, card_number)
  id, name, card_number
FROM cards
WHERE set_name = $1 AND id != $2
ORDER BY name, card_number, id
LIMIT 6;
```

**Simulated EXPLAIN (Local Analysis)**:

```
Limit  (cost=350..355 rows=6 width=80)
  ->  Unique  (cost=300..350 rows=50 width=80)
        ->  Sort  (cost=300..320 rows=200 width=80)
              Sort Key: name, card_number, id
              ->  Seq Scan on cards  (cost=0..180 rows=200 width=80)
                    Filter: (set_name = $1) AND (id <> $2)
```

**Why It's Slow**:

- Sequential scan filtered by `set_name`
- Sort + unique for DISTINCT ON

**Proposed Index (5)** — Conditional:

```sql
CREATE INDEX IF NOT EXISTS cards_set_name_name_card_number_idx
  ON cards (set_name, name, card_number);
```

**Rationale**: Composite index enabling index-only scan for the filter + sort pattern.

**Risk**: Overlaps with proposed index #4. May be redundant. Defer pending query frequency analysis.

---

## Summary: Proposed Index Changes

| #   | Index Name                             | Table             | Columns                       | Rationale                          | Priority | Risk           |
| --- | -------------------------------------- | ----------------- | ----------------------------- | ---------------------------------- | -------- | -------------- |
| 1   | `seller_blacklist_seller_username_idx` | seller_blacklist  | (seller_username)             | Correlated NOT EXISTS optimization | HIGH     | Low            |
| 2   | `listing_overrides_listing_id_idx`     | listing_overrides | (listing_id)                  | Correlated EXISTS optimization     | HIGH     | Low            |
| 3   | `listings_discount_percent_idx`        | listings          | (discount_percent) partial    | Sort optimization                  | DEFERRED | High write amp |
| 4   | `cards_name_set_name_card_number_idx`  | cards             | (name, set_name, card_number) | Related cards lookup               | MEDIUM   | Moderate       |
| 5   | `cards_set_name_name_card_number_idx`  | cards             | (set_name, name, card_number) | Same-set cards lookup              | LOW      | Redundancy     |

---

## Next Steps (P2.2-B)

1. **Run production EXPLAIN ANALYZE** for queries 1A, 1B, 2A, 3B, 3C, 3D
2. **Validate existing indexes** — confirm what's already in place
3. **Create migration files** for approved indexes (#1, #2, #4)
4. **Monitor after deployment** — compare query latency before/after

---

## Appendix A: Existing Indexes (Known)

From migration history:

- `listings_card_id_idx` ON listings(card_id) — migration 006
- `listings_market_card_id_idx` ON listings(market, card_id) — mentioned in 006 comments

From standard PK/FK constraints:

- `cards_pkey` ON cards(id)
- `listings_pkey` ON listings(id)
- `historical_prices_pkey` (assumed composite on card_id + market or similar)

---

## Appendix B: Evidence Source

**Source Type**: Local static analysis of query code paths
**Why Representative**: Query shapes are deterministic from code. However, actual execution plans depend on:

- Table statistics (row counts, cardinality)
- PostgreSQL planner decisions
- Neon-specific optimizations

**Validation Required**: Production EXPLAIN ANALYZE before any index implementation.

---

## Governance

- **Allowlist honored**: Only `docs/db/INDEX_AUDIT_P2.2.md` created
- **No migrations/code touched**: This is documentation only
- **Evidence source stated**: Local static analysis (not production)
- **Open risks/deferrals**: Index #3 deferred (high write amp), Index #5 deferred (redundancy)

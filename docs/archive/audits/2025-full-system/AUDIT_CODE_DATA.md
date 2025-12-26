> **Archived after Full System Audit closeout (2025-12-26)**

# Data / DB Layer Code Audit (Archived)

```
Audit Artifact (Archived)
Phase: 3C — Data / DB Layer
Created: 2025-12-26
Archived: 2025-12-26
```

---

## 1. DB Access Stack

### ORM/Tooling Used

**No ORM** - Direct SQL via `pg` (node-postgres).

Evidence:

- `package.json` lists `"pg": "^8.13.0"` as production dependency
- No Prisma: `rg "prisma|PrismaClient"` returns only docs/package-lock mentions
- All queries use raw SQL strings

### Connection Entry Point

**Location**: `lib/db.ts`

```typescript
// lib/db.ts:1-37
import { Pool, QueryResultRow } from "pg";

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set...");
  }
  if (global.pgPool) {
    return global.pgPool;
  }
  const pool = new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") {
    global.pgPool = pool;
  }
  return pool;
}

export function query<T extends QueryResultRow>(text: string, params?: any[]) {
  return getPool().query<T>(text, params);
}
```

### Environment Variables

| Variable       | Purpose                      | Location       |
| -------------- | ---------------------------- | -------------- |
| `DATABASE_URL` | PostgreSQL connection string | `lib/db.ts:13` |

### Pooling/Retry Logic

| Feature                          | Status | Evidence                                           |
| -------------------------------- | ------ | -------------------------------------------------- |
| Connection pooling               | Yes    | `new Pool({ connectionString })` in `lib/db.ts:23` |
| Global singleton (dev)           | Yes    | `global.pgPool` caching in `lib/db.ts:19-27`       |
| Fresh pool per cold start (prod) | Yes    | Pool not cached when `NODE_ENV === 'production'`   |
| Retry on failure                 | No     | No retry wrapper around `query()`                  |
| Transaction support              | No     | No transaction helpers exposed                     |

---

## 2. Schema & Migrations Inventory

### Prisma Schema Files

**None** - No `prisma/` directory exists.

### Migration Folders/Files

**Primary**: `migrations/` (7 files)

| File                                    | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `001_add_fx_rates.sql`                  | FX rates table, multi-currency columns on listings |
| `002_add_listing_integrity_fields.sql`  | Integrity status/reason/score columns              |
| `003_add_catalog_set_fields.sql`        | Catalog set metadata fields                        |
| `004_add_seller_blacklist_history.sql`  | Blacklist audit trail                              |
| `005_add_subscription_last_emailed.sql` | Email cooldown tracking                            |
| `006_add_listings_card_id_idx.sql`      | Performance index                                  |
| `007_add_rate_limits.sql`               | Rate limiting table + cleanup function             |

**Secondary**: `scripts/migrations/` (10 files)

| File                                      | Type | Purpose                         |
| ----------------------------------------- | ---- | ------------------------------- |
| `012_create_listing_overrides.sql`        | DDL  | Override system for allow/block |
| `20251212_add_listing_grade_columns.sql`  | DDL  | Grading fields                  |
| `20251213_add_listing_match_fields.sql`   | DDL  | Match rejection fields          |
| `20251213_add_shipping_known.sql`         | DDL  | Shipping metadata               |
| `20251215_drop_seller_store_name.sql`     | DDL  | Schema cleanup                  |
| `20251216_collector_number_hardening.sql` | DDL  | Collector number fields         |
| `20251217_add_deal_confidence_weight.sql` | DDL  | Confidence scoring              |
| `20251218_add_card_language.sql`          | DDL  | Language tracking               |
| `20251219_add_market_partition.sql`       | DDL  | Market partitioning             |
| `add-seller-store-name-tracking.ts`       | TS   | Data migration script           |

**Naming Pattern**:

- Primary: `NNN_description.sql` (sequential)
- Secondary: `YYYYMMDD_description.sql` or `NNN_description.sql`

### Migration Mechanism

**Manual application** - No auto-run in production.

From `docs/DB_MIGRATIONS_RUNBOOK.md`:

1. Create migration file in `migrations/`
2. Copy SQL to Neon SQL Editor
3. Execute manually
4. Verify with `information_schema` queries
5. Update `PROJECT_SSOT.md`

**Runner script**: `scripts/run-migration.ts`

- Takes migration file path as argument
- Executes raw SQL via `lib/db.query()`
- No migration tracking table

---

## 3. Tables/Models Map

### Core Tables (from `scripts/init-db.ts`)

| Table                      | Where Defined                                              | Read Paths                                                                   | Write Paths                                                         | Owner Feature       |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| `cards`                    | `scripts/init-db.ts:4-18`                                  | `app/api/deals/dealsQuery.ts`, `app/cards/[cardId]/page.tsx`, `lib/cards.ts` | `scripts/seed-cards.ts`, `scripts/update-listings.ts`               | Card catalog        |
| `historical_prices`        | `scripts/init-db.ts:20-28`                                 | `app/api/deals/dealsQuery.ts`, `app/api/historicals/[cardId]/route.ts`       | `scripts/update-historical-prices.ts`                               | Price benchmarks    |
| `listings`                 | `scripts/init-db.ts:30-70`                                 | `app/api/deals/route.ts`, `app/cards/[cardId]/page.tsx`, all deal pages      | `scripts/update-listings.ts`, admin routes                          | Deal display        |
| `ebay_sold_listings`       | `scripts/init-db.ts:76-86`                                 | `app/api/historicals/[cardId]/route.ts`                                      | `scripts/update-sold-listings.ts`                                   | Price history chart |
| `card_search_config`       | `scripts/init-db.ts:88-95`                                 | `scripts/update-listings.ts`                                                 | `scripts/seed-cards.ts`                                             | Search config       |
| `seller_blacklist`         | `scripts/init-db.ts:97-101`                                | All deal queries (exclusion check)                                           | `app/api/admin/blacklist-seller/route.ts`                           | Seller moderation   |
| `seller_blacklist_history` | `scripts/init-db.ts:103-108`                               | N/A (audit only)                                                             | Admin routes                                                        | Audit trail         |
| `rejected_listings`        | `scripts/init-db.ts:110-117`                               | N/A (audit only)                                                             | `app/api/admin/hide-listing/route.ts`, `scripts/update-listings.ts` | Rejection log       |
| `alerts_watchlist`         | `scripts/init-db.ts:119-130`                               | `app/admin/alerts/page.tsx`                                                  | Admin alert routes                                                  | Admin alerts        |
| `alerts_log`               | `scripts/init-db.ts:132-142`                               | `app/alerts/page.tsx`                                                        | `scripts/check-alerts.ts`                                           | Alert history       |
| `email_subscriptions`      | `scripts/init-db.ts:144-157`                               | `lib/emailSubscriptions.ts`                                                  | `app/api/alerts/subscribe/route.ts`                                 | User alerts         |
| `catalog_sets`             | `scripts/init-db.ts:171-180`                               | `app/catalog/page.tsx`                                                       | `scripts/import-tcgplayer-catalog.ts`                               | Set catalog         |
| `catalog_cards`            | `scripts/init-db.ts:182-194`                               | `app/catalog/sets/[catalogSetId]/page.tsx`                                   | `scripts/import-tcgplayer-catalog.ts`                               | Card catalog        |
| `fx_rates`                 | `migrations/001_add_fx_rates.sql:5-11`                     | `app/api/health/route.ts`                                                    | Manual update only                                                  | Currency conversion |
| `rate_limits`              | `migrations/007_add_rate_limits.sql:5-11`                  | `lib/rateLimit.ts`                                                           | `lib/rateLimit.ts`                                                  | Rate limiting       |
| `listing_overrides`        | `scripts/migrations/012_create_listing_overrides.sql:9-16` | `app/api/deals/dealsQuery.ts`, `app/api/debug/overrides/route.ts`            | Admin routes, debug routes                                          | Override system     |

---

## 4. Critical Data Flows

### Flow 1: Deal Ingestion / Refresh

**Trigger**: GitHub Action `data-pipelines.yml` → `update-listings` job (every 30 min)

**Path**:

```
.github/workflows/data-pipelines.yml:104-106
  ↓
scripts/update-listings.ts
  ↓
lib/ebay.ts (fetchEbayListings)
  ↓
lib/db.ts (query)
  ↓
INSERT INTO listings ... ON CONFLICT DO UPDATE
```

**Tables touched**:

- **Read**: `card_search_config`, `cards`, `historical_prices`, `seller_blacklist`
- **Write**: `listings`, `rejected_listings`

**Side effects**: None (DB only)

### Flow 2: Deals Display (Query → UI)

**Trigger**: Page load on `/`, `/top-deals`, `/sets/[setId]`, etc.

**Path**:

```
app/page.tsx (or other page)
  ↓
app/api/deals/dealsQuery.ts (runDealsQuery)
  ↓
lib/db.ts (query)
  ↓
SELECT ... FROM listings l JOIN cards c ...
  ↓
lib/blacklist.ts (shouldExcludeListingFromCardSurfaces)
  ↓
DealsTable.tsx (client component)
```

**Tables touched**:

- **Read**: `listings`, `cards`, `historical_prices`, `listing_overrides`, `seller_blacklist`
- **Write**: None

**Side effects**: None

### Flow 3: Alerts / Subscriptions Lifecycle

**Create subscription**:

```
POST /api/alerts/subscribe
  ↓
lib/emailSubscriptions.ts (createOrUpdateSubscription)
  ↓
INSERT INTO email_subscriptions
```

**Evaluate + send**:

```
.github/workflows/data-pipelines.yml → check-alerts job (manual only currently)
  ↓
scripts/check-alerts.ts
  ↓
SELECT FROM alerts_watchlist
  ↓
SELECT best listing FROM listings
  ↓
INSERT INTO alerts_log
  ↓
lib/emailQueue.ts (queueAlertEmail → SendGrid)
  ↓
UPDATE email_subscriptions SET last_emailed_at
```

**Tables touched**:

- **Read**: `alerts_watchlist`, `listings`, `cards`, `seller_blacklist`, `email_subscriptions`
- **Write**: `alerts_log`, `email_subscriptions`, `alerts_watchlist` (last_triggered_at)

**Side effects**: Email via SendGrid

---

## 5. Data Freshness Posture

### Scheduled Jobs

From `.github/workflows/data-pipelines.yml`:

| Job                        | Schedule                         | Tables Updated                      | Evidence            |
| -------------------------- | -------------------------------- | ----------------------------------- | ------------------- |
| `update-listings`          | `*/30 * * * *` (every 30 min)    | `listings`, `rejected_listings`     | Lines 21-22, 66-106 |
| `check-alerts`             | Manual only (was `*/15 * * * *`) | `alerts_log`, `email_subscriptions` | Lines 109-135       |
| `update-historical-prices` | `0 3 * * *` (daily 3 AM UTC)     | `historical_prices`                 | Lines 26, 166-191   |
| `update-sold-listings`     | `0 4 * * *` (daily 4 AM UTC)     | `ebay_sold_listings`                | Lines 28, 193-218   |
| `show-fx-rates`            | Manual only                      | None (display only)                 | Lines 137-164       |

### Freshness Indicators

| Table               | Freshness Column  | Update Source                                      |
| ------------------- | ----------------- | -------------------------------------------------- |
| `listings`          | `updated_at`      | `scripts/update-listings.ts` sets `NOW()`          |
| `historical_prices` | `last_updated_at` | `scripts/update-historical-prices.ts` sets `NOW()` |
| `fx_rates`          | `updated_at`      | Manual only                                        |

### Health Check Freshness

`app/api/health/route.ts` reports:

- `listings.lastUpdated` - MAX(updated_at)
- `listings.staleCount1h` - COUNT where updated_at < NOW() - 1 hour
- `historicalPrices.lastUpdated` - MAX(last_updated_at)
- `fxRates.lastUpdated` - latest rate timestamp

### TTL / Pruning Logic

| Table               | Pruning                      | Evidence                                                      |
| ------------------- | ---------------------------- | ------------------------------------------------------------- |
| `rate_limits`       | Entries > 1 hour old deleted | `migrations/007_add_rate_limits.sql:23-32` (cleanup function) |
| `listings`          | No pruning                   | Listings persist until manually deleted                       |
| `rejected_listings` | No pruning                   | Audit trail retained                                          |

---

## 6. Constraints, Indexes, and Integrity

### Unique Constraints

| Table                 | Constraint                                                       | Purpose                       | Evidence                                                |
| --------------------- | ---------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| `cards`               | `(name, set_name, card_number, condition_bucket)`                | Dedupe card entries           | `scripts/init-db.ts:17`                                 |
| `historical_prices`   | `(card_id, market)`                                              | One price per card per market | `scripts/init-db.ts:27`                                 |
| `listings`            | `(listing_id)`                                                   | Primary dedupe key            | `scripts/init-db.ts:69`                                 |
| `listings`            | `(listing_id, market)`                                           | Multi-market dedupe           | `migrations/001_add_fx_rates.sql:46-47`                 |
| `card_search_config`  | `(card_id, search_query, market)`                                | Search config dedupe          | `scripts/init-db.ts:94`                                 |
| `seller_blacklist`    | `(seller_username)`                                              | One entry per seller          | `scripts/init-db.ts:99`                                 |
| `email_subscriptions` | Partial: `(card_id, lower(email)) WHERE unsubscribed_at IS NULL` | Active subscription dedupe    | `scripts/init-db.ts:155-157`                            |
| `listing_overrides`   | `(listing_id)` PRIMARY KEY                                       | One override per listing      | `scripts/migrations/012_create_listing_overrides.sql:9` |

### Foreign Keys

| Table                 | Column           | References             | On Delete | Evidence                 |
| --------------------- | ---------------- | ---------------------- | --------- | ------------------------ |
| `historical_prices`   | `card_id`        | `cards(id)`            | CASCADE   | `scripts/init-db.ts:22`  |
| `listings`            | `card_id`        | `cards(id)`            | SET NULL  | `scripts/init-db.ts:32`  |
| `ebay_sold_listings`  | `card_id`        | `cards(id)`            | CASCADE   | `scripts/init-db.ts:78`  |
| `card_search_config`  | `card_id`        | `cards(id)`            | CASCADE   | `scripts/init-db.ts:90`  |
| `alerts_watchlist`    | `card_id`        | `cards(id)`            | CASCADE   | `scripts/init-db.ts:121` |
| `alerts_log`          | `watch_id`       | `alerts_watchlist(id)` | CASCADE   | `scripts/init-db.ts:134` |
| `alerts_log`          | `card_id`        | `cards(id)`            | CASCADE   | `scripts/init-db.ts:135` |
| `email_subscriptions` | `card_id`        | `cards(id)`            | CASCADE   | `scripts/init-db.ts:146` |
| `catalog_cards`       | `catalog_set_id` | `catalog_sets(id)`     | CASCADE   | `scripts/init-db.ts:184` |

### Key Indexes

| Table               | Index                  | Purpose                | Evidence                                                 |
| ------------------- | ---------------------- | ---------------------- | -------------------------------------------------------- |
| `listings`          | `market_idx`           | Market filtering       | `scripts/init-db.ts:72`                                  |
| `listings`          | `market_card_id_idx`   | Card+market queries    | `scripts/init-db.ts:73`                                  |
| `listings`          | `integrity_status_idx` | Integrity filtering    | `scripts/init-db.ts:74`                                  |
| `rate_limits`       | `key_created_idx`      | Sliding window lookups | `migrations/007_add_rate_limits.sql:14-15`               |
| `listing_overrides` | `override_type_idx`    | Type filtering         | `scripts/migrations/012_create_listing_overrides.sql:19` |

### Check Constraints

| Table      | Column                        | Constraint                       | Evidence                            |
| ---------- | ----------------------------- | -------------------------------- | ----------------------------------- |
| `cards`    | `language`                    | `IN ('EN','JP','UNKNOWN')`       | `scripts/init-db.ts:9`              |
| `cards`    | `collector_number_confidence` | `IN ('NONE','LOW','MED','HIGH')` | `scripts/init-db.ts:12`             |
| `listings` | `collector_number_confidence` | `IN ('NONE','LOW','MED','HIGH')` | `scripts/init-db.ts:59`             |
| `fx_rates` | `rate_to_usd`                 | `> 0`                            | `migrations/001_add_fx_rates.sql:8` |

---

## 7. Findings & Follow-ups

### Confirmed Risks

1. **No migration tracking table** - Migrations are applied manually with no DB record of what's been run. Risk of re-running or missing migrations. Evidence: No `schema_migrations` table in `init-db.ts`.

2. **No transaction wrappers** - `lib/db.ts` exposes only `query()`, no `transaction()` helper. Complex multi-statement operations could leave partial state. Evidence: `lib/db.ts:32-37`.

3. **Schema checks on every request** - `lib/schema.ts` caches results in-memory but fresh cold starts re-query `information_schema.columns`. Evidence: `lib/schema.ts:22-27`.

4. **FX rates require manual update** - No automated FX rate refresh. Evidence: `.github/workflows/data-pipelines.yml:29-30`.

### Unknowns

1. **Neon branching/backup policy** - Outside repo; documented in `docs/BACKUP_POLICY.md` but actual Neon settings not visible in code.

2. **Production migration applied state** - No way to verify from code which migrations have been applied to production DB.

3. **Listing pruning strategy** - Stale listings (ended auctions) appear to persist indefinitely. No visible cleanup logic.

### Candidate Workstreams

1. **Add migration tracking table** - Record applied migrations with timestamps
2. **Add transaction helper** - Wrap multi-statement operations
3. **Cache schema checks at build time** - Eliminate runtime `information_schema` queries
4. **Automated FX rate refresh** - Daily job to fetch current rates
5. **Stale listing cleanup** - Prune listings where `ends_at < NOW() - interval`

---

## Appendix: Evidence Commands

```bash
# Starting HEAD
git rev-parse HEAD
# 1680e116796065e84db82d4135bf81405eaeac2d

# No Prisma
rg "prisma|PrismaClient" --files-with-matches
# Only docs/package-lock

# Migration count
ls migrations/*.sql | wc -l
# 7

# Scripts migrations count
ls scripts/migrations/*.sql | wc -l
# 9

# Tables with INSERT
rg "INSERT INTO" scripts/*.ts --files-with-matches | wc -l
# 13
```

---

**LOCKED**: Phase 3C data/DB audit only; no code/config/workflow edits
**VERIFIED**: Single audit doc created; evidence path-cited; no secrets logged
**REGRESSION**: N/A (read-only)
**OPEN QUESTIONS**: Neon backup policy details; production migration state; listing pruning strategy

---

**End of Phase 3C Audit**

# M07: DB Architecture + Migrations Review

**Module**: M07 — DB Architecture + Migrations
**Status**: REVIEW COMPLETE
**Date**: 2025-12-30

---

## 1) Path Map

### Database Client

| Location       | Path        | Line(s) | Description                                    |
| -------------- | ----------- | ------- | ---------------------------------------------- |
| DB pool        | `lib/db.ts` | 12-30   | `getPool()` — lazy-init Pool, caches in global |
| Query function | `lib/db.ts` | 32-37   | `query<T>()` — typed query wrapper             |
| Env loading    | `lib/db.ts` | 6       | Loads `.env.local` via dotenv for scripts      |
| Pool error     | `lib/db.ts` | 15-17   | Throws if DATABASE_URL not set                 |

### Schema Definition (init-db.ts)

| Location            | Path                 | Line(s) | Description                                           |
| ------------------- | -------------------- | ------- | ----------------------------------------------------- |
| Cards table         | `scripts/init-db.ts` | 4-18    | Primary card identity table                           |
| Historical prices   | `scripts/init-db.ts` | 20-33   | Per-card market baselines, `UNIQUE (card_id, market)` |
| Listings table      | `scripts/init-db.ts` | 35-75   | Active eBay listings, `UNIQUE (listing_id)`           |
| FX rates table      | `scripts/init-db.ts` | 82-88   | Currency conversion rates                             |
| Sold listings       | `scripts/init-db.ts` | 104-125 | Historical sold data for baseline calculation         |
| Card search config  | `scripts/init-db.ts` | 133-140 | Per-card eBay search queries                          |
| Seller blacklist    | `scripts/init-db.ts` | 142-146 | Blacklisted seller usernames                          |
| Blacklist history   | `scripts/init-db.ts` | 148-153 | Audit trail for blacklist changes                     |
| Rejected listings   | `scripts/init-db.ts` | 155-162 | Manually hidden listings log                          |
| Alerts watchlist    | `scripts/init-db.ts` | 164-175 | Alert subscriptions (Tier 2)                          |
| Alerts log          | `scripts/init-db.ts` | 177-187 | Alert trigger history (Tier 2)                        |
| Email subscriptions | `scripts/init-db.ts` | 189-202 | Email alert signups (Tier 2)                          |
| Catalog sets        | `scripts/init-db.ts` | 216-225 | TCGPlayer/Pokemon set catalog                         |
| Catalog cards       | `scripts/init-db.ts` | 227-239 | TCGPlayer/Pokemon card catalog                        |
| Listing overrides   | Migration 012        | N/A     | Override table for ALLOW/HARD_BLOCK/SOFT_EXCLUDE      |

### Primary Migrations (Applied via Neon SQL Editor)

| File                                                         | Purpose                               |
| ------------------------------------------------------------ | ------------------------------------- |
| `migrations/001_add_fx_rates.sql`                            | FX rates table                        |
| `migrations/002_add_listing_integrity_fields.sql`            | Integrity status/reason/score columns |
| `migrations/003_add_catalog_set_fields.sql`                  | Catalog set metadata columns          |
| `migrations/004_add_seller_blacklist_history.sql`            | Blacklist audit history table         |
| `migrations/005_add_subscription_last_emailed.sql`           | Email subscription tracking           |
| `migrations/006_add_listings_card_id_idx.sql`                | Performance index                     |
| `migrations/007_add_rate_limits.sql`                         | Rate limit tracking table             |
| `migrations/009_option_a_fx_rate_runs.sql`                   | FX rate run history                   |
| `migrations/010_option_a_listings_snapshot_fx_precision.sql` | Snapshot/FX precision                 |
| `migrations/011_option_a_sold_fx_snapshot.sql`               | Sold listings FX columns              |
| `migrations/012_option_a_historical_baseline_usd.sql`        | Baseline USD columns                  |
| `migrations/013_add_watchlist_entries.sql`                   | DB-backed watchlist (Tier 2)          |

### Scripts Migrations (Data Migrations)

| File                                                         | Purpose                   |
| ------------------------------------------------------------ | ------------------------- |
| `scripts/migrations/012_create_listing_overrides.sql`        | Override table DDL        |
| `scripts/migrations/20251212_add_listing_grade_columns.sql`  | Grade columns             |
| `scripts/migrations/20251213_add_listing_match_fields.sql`   | Match eligibility fields  |
| `scripts/migrations/20251213_add_shipping_known.sql`         | Shipping known flag       |
| `scripts/migrations/20251215_drop_seller_store_name.sql`     | Drop deprecated column    |
| `scripts/migrations/20251216_collector_number_hardening.sql` | Collector number columns  |
| `scripts/migrations/20251217_add_deal_confidence_weight.sql` | Confidence weight column  |
| `scripts/migrations/20251218_add_card_language.sql`          | Card language column      |
| `scripts/migrations/20251219_add_market_partition.sql`       | Market column on listings |

### Migration Runner

| Location       | Path                           | Line(s) | Description                        |
| -------------- | ------------------------------ | ------- | ---------------------------------- |
| Generic runner | `scripts/run-migration.ts`     | all     | Runs any .sql file via query()     |
| 012 runner     | `scripts/run-migration-012.ts` | all     | Specific runner for override table |

### DB-Writing Scripts (Danger Zone)

| Script                                  | Operation           | Safety Gates                         |
| --------------------------------------- | ------------------- | ------------------------------------ |
| `scripts/init-db.ts`                    | CREATE/ALTER tables | Idempotent (IF NOT EXISTS)           |
| `scripts/update-listings.ts`            | INSERT/UPDATE       | None (production pipeline)           |
| `scripts/update-historical-prices.ts`   | UPDATE              | None (production pipeline)           |
| `scripts/update-sold-listings.ts`       | INSERT              | None (production pipeline)           |
| `scripts/update-fx-rates.ts`            | UPDATE              | Manual CLI args required             |
| `scripts/update-fx-rates-auto.ts`       | UPDATE              | Hard bounds + drift gating           |
| `scripts/purge-blacklisted-listings.ts` | DELETE              | CONFIRM_DELETE + CONFIRM_PROD_DELETE |
| `scripts/seed-cards.ts`                 | INSERT/UPDATE       | None (dev seeding)                   |
| `scripts/fix-gbp-listings.ts`           | UPDATE              | None                                 |
| `scripts/enrich-single-listing.ts`      | UPDATE              | None                                 |
| `scripts/backfill-*.ts`                 | UPDATE              | None (backfill operations)           |
| `scripts/check-alerts.ts`               | UPDATE last_checked | None                                 |
| `scripts/e2e-test-alerts.ts`            | DELETE test data    | Test mode only                       |

### API Routes with DB Writes

| Route                                     | Operation           | Auth Required  |
| ----------------------------------------- | ------------------- | -------------- |
| `app/api/admin/allow-listing/route.ts`    | INSERT override     | Admin          |
| `app/api/admin/revoke-allow/route.ts`     | DELETE override     | Admin          |
| `app/api/admin/hide-listing/route.ts`     | DELETE listing      | Admin          |
| `app/api/admin/blacklist-seller/route.ts` | INSERT blacklist    | Admin          |
| `app/api/admin/alerts/create/route.ts`    | INSERT alert        | Admin          |
| `app/api/admin/alerts/delete/route.ts`    | DELETE alert        | Admin          |
| `app/api/debug/overrides/route.ts`        | INSERT override     | Debug token    |
| `app/api/alerts/subscribe/route.ts`       | INSERT subscription | Public         |
| `app/api/alerts/unsubscribe/route.ts`     | UPDATE subscription | Token          |
| `app/api/watchlist/route.ts`              | INSERT/DELETE       | Public (Tier2) |

### Workflows Using DATABASE_URL

| Workflow                                  | Jobs                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| `.github/workflows/data-pipelines.yml`    | update-listings, check-alerts, update-fx, historicals |
| `.github/workflows/ops-enable-alerts.yml` | Migration + e2e test jobs                             |

### Schema Type Definitions

| Location       | Path            | Line(s) | Description                       |
| -------------- | --------------- | ------- | --------------------------------- |
| Override types | `lib/schema.ts` | 7-16    | `OverrideType`, `ListingOverride` |
| Column checks  | `lib/schema.ts` | 22-92   | `ensure*Column()` functions       |

---

## 2) Locked Invariants (Candidates)

### L1: DATABASE_URL Required at Runtime

- **Check**: `lib/db.ts:15-17` throws if DATABASE_URL not set
- **Why**: Fail-fast prevents silent query failures
- **Evidence**: All scripts/routes depend on this guard

### L2: Lazy Pool Initialization

- **Check**: Pool created on first query, not at module load
- **Why**: Allows build-time compilation without DB connection (CI fix)
- **Evidence**: `lib/db.ts:12-30`, commit 245bd56

### L3: Migrations via Neon SQL Editor (Primary)

- **Path**: `migrations/*.sql` → Neon dashboard
- **Why**: No migration framework; manual application ensures review
- **Evidence**: `docs/DB_MIGRATIONS_RUNBOOK.md`

### L4: Destructive Script Safety Gates

- **Covered**: `purge-blacklisted-listings.ts` requires CONFIRM_DELETE + CONFIRM_PROD_DELETE
- **Why**: Prevents accidental production data loss
- **Evidence**: `scripts/purge-blacklisted-listings.ts:38-71`

### L5: Idempotent DDL

- **Pattern**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`
- **Why**: Safe to re-run init-db.ts without error
- **Evidence**: `scripts/init-db.ts` throughout

### L6: No ORM / Raw SQL Only

- **Pattern**: All queries use `query()` with parameterized SQL
- **Why**: Explicit SQL, no magic; easier to audit for injection
- **Evidence**: No Prisma/Drizzle/Knex dependencies

---

## 3) Known Risk Points

### R1: Schema Drift (init-db.ts vs Migrations)

- **Path**: `scripts/init-db.ts` vs `migrations/*.sql`
- **Issue**: init-db.ts may have stale schema if migrations aren't reflected
- **Example**: M04 noted `UNIQUE (listing_id)` in init-db vs `UNIQUE (listing_id, market)` in migration
- **Impact**: New DB init could have wrong constraints
- **Severity**: Medium

### R2: No Migration Tracking Table

- **Path**: N/A (no tracking exists)
- **Issue**: No record of which migrations have been applied
- **Impact**: Must manually track; risk of re-applying or missing migrations
- **Severity**: Medium

### R3: Backfill Scripts Lack Safety Gates

- **Path**: `scripts/backfill-*.ts`
- **Issue**: No CONFIRM flags; can update production data accidentally
- **Impact**: Mass UPDATE could corrupt data
- **Severity**: Medium

### R4: FX Rate Writes in Multiple Scripts

- **Paths**: `update-fx-rates.ts`, `update-fx-rates-auto.ts`
- **Issue**: Two scripts can write to fx_rates table
- **Impact**: Potential race; last-write-wins
- **Severity**: Low (workflow controls prevent concurrent runs)

### R5: Public API Routes Accept DB Writes

- **Path**: `app/api/alerts/subscribe/route.ts`
- **Issue**: No auth required for email subscription INSERT
- **Impact**: Spam subscriptions possible
- **Severity**: Low (rate limiting exists via migration 007)

### R6: Cascading Deletes on cards.id

- **Path**: `scripts/init-db.ts:22`, `scripts/init-db.ts:106`
- **Issue**: `ON DELETE CASCADE` on historical_prices, ebay_sold_listings
- **Impact**: Deleting a card removes all history
- **Severity**: Low (intended behavior, but dangerous if misused)

---

## 4) Hardening Opportunities

### MUST (Required for correctness)

None identified — current implementation is functional per SSOT.

### SHOULD (Recommended hardening)

| ID  | Description                                                | Path                    | Effort |
| --- | ---------------------------------------------------------- | ----------------------- | ------ |
| S1  | Add CONFIRM flag to all backfill-\*.ts scripts             | `scripts/backfill-*.ts` | Small  |
| S2  | Document init-db.ts vs migration schema drift risk in SSOT | `PROJECT_SSOT.md`       | Tiny   |
| S3  | Add migration tracking table (applied_migrations)          | New migration           | Medium |
| S4  | Add unit tests for query() error handling                  | New test file           | Small  |

### LATER (Requires refactor — PAUSED during rebaseline)

| ID  | Description                                       | Path                       | Notes        |
| --- | ------------------------------------------------- | -------------------------- | ------------ |
| L1  | Adopt migration framework (e.g., node-pg-migrate) | Multiple                   | Major change |
| L2  | Consolidate FX update scripts                     | `scripts/update-fx-*.ts`   | Low priority |
| L3  | Add rate limiting to subscribe endpoint           | `app/api/alerts/subscribe` | Tier 2 work  |

---

## 5) Test Coverage Gaps

### Gap 1: query() Error Handling (Priority: MEDIUM)

**What to test**:

- DATABASE_URL missing → throws
- Connection failure handling
- Query syntax error propagation

**Where**: `lib/__tests__/unit/db.test.ts` (new file, would need mocking)

### Gap 2: Migration Idempotency (Priority: LOW)

**What to test**:

- init-db.ts can run twice without error
- Each migration file is idempotent

**Where**: Integration tests (requires test DB)

### Gap 3: Safety Gate Scripts (Priority: MEDIUM)

**What to test**:

- purge-blacklisted-listings.ts respects CONFIRM_DELETE
- update-fx-rates-auto.ts respects hard bounds

**Where**: `scripts/__tests__/unit/` (partial coverage exists)

### Existing Coverage (Good)

- `scripts/__tests__/unit/fxBounds.test.ts` — FX hard bounds validation

---

## 6) SSOT Reconciliation

**SSOT states** (PROJECT_SSOT.md "Neon migration note"):

> "To apply `migrations/004_add_seller_blacklist_history.sql`, open Neon SQL editor and run the file contents."

**Code implements**:

- ✅ Migrations live in `migrations/` directory — matches
- ✅ Applied via Neon SQL editor (manual) — matches
- ✅ Runbook exists at `docs/DB_MIGRATIONS_RUNBOOK.md` — matches

**SSOT states** (PROJECT_SSOT.md "CI build dependency fix"):

> "Converted `lib/db.ts` to lazy-initialize DB pool via `getPool()` function instead of module-level instantiation."

**Code implements**:

- ✅ `getPool()` is lazy — matches (`lib/db.ts:12-30`)
- ✅ No module-level Pool instantiation — matches

**Discrepancy**: None found. Code matches SSOT.

---

## 7) Deferred Items

- S3 (migration tracking table) deferred until rebaseline completes
- L1, L2, L3 from Hardening Opportunities are deferred (refactor/Tier 2)

---

## 8) PR A Review Applied

- **PR #139**: Docs-only review of DB architecture + migrations. Path map, locked invariants, risk findings, and test coverage gaps documented.

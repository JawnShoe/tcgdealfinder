# REBASELINE v1 — Complete Repo Packet (2025-12-29)

**Created**: 2025-12-29
**Tag**: `rebaseline-start-2025-12-29`
**Commit**: `d990f42dc32b997870f4bd39d5c21c39b29460df`

---

## Tag Intent

The tag `rebaseline-start-2025-12-29` points to commit `d990f42dc32b997870f4bd39d5c21c39b29460df` on main branch — the pre-rebaseline marker commit. This provides a restore point before any rebaseline inventory/governance changes, enabling rollback if rebaseline introduces regressions.

---

## ERRATA

1. Public Pages header should read "Public Pages (12 pages)" (not 13).
2. API Routes header should read "API Routes (/api/... only) (21 routes)" (not 19).
3. No other changes; counts per Summary table remain: Public 12, Admin 6, Debug Pages 1, API 21, Debug Routes 2 (Total 42).

---

## 1) Evidence of Completeness

| Item                   | Value                                      |
| ---------------------- | ------------------------------------------ |
| git rev-parse HEAD     | `d990f42dc32b997870f4bd39d5c21c39b29460df` |
| Total tracked files    | **351**                                    |
| Excluded (not tracked) | `node_modules/`, `.next/`, `.git/`         |

---

## 2) Full Repo Tree (Top-Level + 2 Levels Deep)

```
.
├── .claude/
├── .github/
│   └── workflows/
├── .husky/
│   └── _/
├── app/
│   ├── admin/
│   ├── alerts/
│   ├── api/
│   ├── cards/
│   ├── catalog/
│   ├── debug/
│   ├── ending-soon/
│   ├── newest/
│   ├── search/
│   ├── sets/
│   ├── top-deals/
│   └── watchlist/
├── components/
│   └── home/
├── docs/
│   ├── archive/
│   ├── audit/
│   ├── design/
│   ├── ops/
│   ├── plan/
│   └── ui/
├── hooks/
├── lib/
│   └── __tests__/
├── migrations/
├── public/
├── scripts/
│   ├── __tests__/
│   ├── migrations/
│   └── one-off/
└── types/
```

### Folder Sizes

| Folder     | Size |
| ---------- | ---- |
| app        | 431K |
| components | 340K |
| lib        | 420K |
| scripts    | 515K |
| docs       | 517K |
| migrations | 45K  |
| .github    | 41K  |
| types      | 5.0K |
| hooks      | 4.0K |

---

## 3) Largest Files (Top 30)

| Size (bytes) | File                                                        | Bloat Flag                |
| ------------ | ----------------------------------------------------------- | ------------------------- |
| 397,406      | package-lock.json                                           | Normal (lockfile)         |
| 122,566      | PROJECT_SSOT.md                                             | Large SSOT                |
| 65,174       | components/CardDetailClient.tsx                             | Component bloat candidate |
| 62,800       | components/DealsTable.tsx                                   | Component bloat candidate |
| 55,564       | app/debug/exclusions/ExclusionsClient.tsx                   | Debug-only                |
| 42,681       | lib/blacklist.ts                                            | Data (keyword list)       |
| 37,858       | app/sets/[setId]/page.tsx                                   | Page component            |
| 36,594       | scripts/update-listings.ts                                  | Normal script             |
| 31,952       | docs/audit/EXPERT_AUDIT_2025-12-25.md                       | Normal docs               |
| 31,337       | docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md                   | Normal docs               |
| 25,317       | lib/ebay.ts                                                 | Normal                    |
| 23,807       | components/AdminBlacklistClient.tsx                         | Admin component           |
| 22,458       | docs/design/DESIGN_AUDIT_2025-01.md                         | Normal docs               |
| 22,207       | app/cards/[cardId]/page.tsx                                 | Normal page               |
| 22,042       | docs/archive/audits/2025-full-system/AUDIT_CODE_OPS.md      | Archived docs             |
| 21,419       | docs/archive/audits/2025-full-system/AUDIT_CODE_DATA.md     | Archived docs             |
| 17,634       | app/top-deals/page.tsx                                      | Normal page               |
| 17,418       | app/api/deals/dealsQuery.ts                                 | Normal API                |
| 17,315       | lib/**tests**/integration/consistency.test.ts               | Test file                 |
| 16,792       | docs/archive/audits/2025-full-system/AUDIT_CODE_BACKEND.md  | Archived docs             |
| 16,460       | app/globals.css                                             | Normal styles             |
| 16,397       | lib/tableColumns.tsx                                        | Normal                    |
| 15,788       | docs/archive/audits/2025-full-system/AUDIT_CODE_FRONTEND.md | Archived docs             |
| 15,710       | docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md       | Normal docs               |
| 14,061       | app/sets/page.tsx                                           | Normal page               |
| 13,931       | app/ending-soon/page.tsx                                    | Normal page               |
| 13,844       | scripts/import-pokemontcg-catalog.ts                        | Normal script             |
| 13,448       | components/AdminAlertsClient.tsx                            | Admin component           |
| 13,389       | docs/ENV_RUNBOOK.md                                         | Normal docs               |
| 13,193       | lib/**tests**/integration/softExclusion.test.ts             | Test file                 |

---

## 4) Route Matrix (Next.js)

### Public Pages (12 pages)

| #   | Route                                                                     |
| --- | ------------------------------------------------------------------------- |
| 1   | app/page.tsx (`/`)                                                        |
| 2   | app/top-deals/page.tsx (`/top-deals`)                                     |
| 3   | app/newest/page.tsx (`/newest`)                                           |
| 4   | app/ending-soon/page.tsx (`/ending-soon`)                                 |
| 5   | app/watchlist/page.tsx (`/watchlist`)                                     |
| 6   | app/sets/page.tsx (`/sets`)                                               |
| 7   | app/sets/[setId]/page.tsx (`/sets/[setId]`)                               |
| 8   | app/cards/[cardId]/page.tsx (`/cards/[cardId]`)                           |
| 9   | app/search/page.tsx (`/search`)                                           |
| 10  | app/catalog/page.tsx (`/catalog`)                                         |
| 11  | app/catalog/sets/[catalogSetId]/page.tsx (`/catalog/sets/[catalogSetId]`) |
| 12  | app/alerts/page.tsx (`/alerts`)                                           |

### Admin Pages (6 pages)

| #   | Route                                               |
| --- | --------------------------------------------------- |
| 1   | app/admin/page.tsx (`/admin`)                       |
| 2   | app/admin/exclusions/page.tsx (`/admin/exclusions`) |
| 3   | app/admin/alerts/page.tsx (`/admin/alerts`)         |
| 4   | app/admin/blacklist/page.tsx (`/admin/blacklist`)   |
| 5   | app/admin/listings/page.tsx (`/admin/listings`)     |
| 6   | app/admin/login/page.tsx (`/admin/login`)           |

### Debug Pages (1 page)

| #   | Route                                               |
| --- | --------------------------------------------------- |
| 1   | app/debug/exclusions/page.tsx (`/debug/exclusions`) |

### API Routes (/api/... only) (21 routes)

| #   | Route                                                                               |
| --- | ----------------------------------------------------------------------------------- |
| 1   | app/api/deals/route.ts (`/api/deals`)                                               |
| 2   | app/api/health/route.ts (`/api/health`)                                             |
| 3   | app/api/market/route.ts (`/api/market`)                                             |
| 4   | app/api/search-cards/route.ts (`/api/search-cards`)                                 |
| 5   | app/api/watchlist/route.ts (`/api/watchlist`)                                       |
| 6   | app/api/watchlist-cards/route.ts (`/api/watchlist-cards`)                           |
| 7   | app/api/historicals/[cardId]/route.ts (`/api/historicals/[cardId]`)                 |
| 8   | app/api/cards/[cardId]/other-markets/route.ts (`/api/cards/[cardId]/other-markets`) |
| 9   | app/api/listings/by-ebay-id/route.ts (`/api/listings/by-ebay-id`)                   |
| 10  | app/api/alerts/subscribe/route.ts (`/api/alerts/subscribe`)                         |
| 11  | app/api/alerts/unsubscribe/route.ts (`/api/alerts/unsubscribe`)                     |
| 12  | app/api/admin/login/route.ts (`/api/admin/login`)                                   |
| 13  | app/api/admin/alerts/create/route.ts (`/api/admin/alerts/create`)                   |
| 14  | app/api/admin/alerts/toggle/route.ts (`/api/admin/alerts/toggle`)                   |
| 15  | app/api/admin/alerts/delete/route.ts (`/api/admin/alerts/delete`)                   |
| 16  | app/api/admin/allow-listing/route.ts (`/api/admin/allow-listing`)                   |
| 17  | app/api/admin/revoke-allow/route.ts (`/api/admin/revoke-allow`)                     |
| 18  | app/api/admin/blacklist-seller/route.ts (`/api/admin/blacklist-seller`)             |
| 19  | app/api/admin/hide-listing/route.ts (`/api/admin/hide-listing`)                     |
| 20  | app/api/debug/integrity/route.ts (`/api/debug/integrity`)                           |
| 21  | app/api/debug/overrides/route.ts (`/api/debug/overrides`)                           |

### Debug Routes (non-API) (2 routes)

| #   | Route                                       |
| --- | ------------------------------------------- |
| 1   | app/debug/login/route.ts (`/debug/login`)   |
| 2   | app/debug/logout/route.ts (`/debug/logout`) |

### Summary

| Category               | Count  |
| ---------------------- | ------ |
| Public Pages           | 12     |
| Admin Pages            | 6      |
| Debug Pages            | 1      |
| API Routes             | 21     |
| Debug Routes (non-API) | 2      |
| **Total**              | **42** |

---

## 5) Tooltip Inventory

### Tooltip Classes (defined in globals.css)

| Class          | Purpose                    | Line |
| -------------- | -------------------------- | ---- |
| `tooltip-wide` | Wide tooltip (badge/short) | 447  |
| `tooltip-help` | Help tooltip (paragraph)   | 455  |

### Files Using `tooltip-wide` (12 locations)

| File                                     | Usage                                       |
| ---------------------------------------- | ------------------------------------------- |
| components/FeaturedDealsStrip.tsx:115    | `tooltip-wide tooltip-help`                 |
| components/CardIdentity.tsx:64,77        | `tooltip-wide`                              |
| components/WhyDealHint.tsx:47            | `tooltip-wide`                              |
| components/CardDetailClient.tsx:997,1326 | `tooltip-wide tooltip-help`, `tooltip-wide` |
| components/DealsTable.tsx:757            | `tooltip-wide tooltip-help`                 |
| components/SellerSeenBadge.tsx:30        | `tooltip-wide tooltip-help`                 |
| components/SellerNameWithTooltip.tsx:100 | `tooltip-wide`                              |
| components/WatchlistStarButton.tsx:112   | `tooltip-wide`                              |
| components/TopDealsClient.tsx:178        | `tooltip-wide tooltip-help`                 |
| components/TrustedBadge.tsx:17           | `tooltip-wide`                              |

### Files Using `usePortal={true}` (9 components)

| File                                 | Lines                |
| ------------------------------------ | -------------------- |
| components/CardIdentity.tsx          | 66, 79               |
| components/CardDetailClient.tsx      | 801, 851, 1328, 1517 |
| components/SellerNameWithTooltip.tsx | 102                  |
| components/WatchlistStarButton.tsx   | 114                  |
| components/TrustedBadge.tsx          | 19                   |
| components/DealsTable.tsx            | 140, 1460            |
| lib/tableColumns.tsx                 | 448                  |

### Category Summary

- **Help/Paragraph tooltips** (`tooltip-help`): FeaturedDealsStrip, CardDetailClient, DealsTable, SellerSeenBadge, TopDealsClient
- **Badge/Short tooltips** (`tooltip-wide` only): CardIdentity, WhyDealHint, SellerNameWithTooltip, WatchlistStarButton, TrustedBadge

---

## 6) Workflow Inventory

| Filename                  | Schedule (cron lines)                                                 | Trigger Type                     |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| ci.yml                    | (none)                                                                | `pull_request` only              |
| data-pipelines.yml        | `*/30 * * * *`, `*/15 * * * *`, `0 3 * * *`, `0 4 * * *`, `0 * * * *` | `schedule` + `workflow_dispatch` |
| dependabot-auto-merge.yml | (none)                                                                | `pull_request` (Dependabot)      |
| job-silence-watchdog.yml  | `0 */2 * * *`                                                         | `schedule` + `workflow_dispatch` |
| ops-enable-alerts.yml     | (none)                                                                | `workflow_dispatch` only         |

**Total Workflows: 5**

### Workflow Details

| Workflow              | Secrets/Env Referenced                                                                      | Purpose                       | Paused/Manual?                  |
| --------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| CI                    | None (secretless)                                                                           | Lint, test:unit, build on PRs | No                              |
| Data Pipelines        | DATABASE_URL, EBAY_APP_ID, EBAY_CLIENT_SECRET, OPEN_EXCHANGE_RATES_APP_ID, SENDGRID_API_KEY | Automated data refresh        | check-alerts: manual-only       |
| Dependabot Auto-Merge | GITHUB_TOKEN                                                                                | Auto-merge patch/minor PRs    | No                              |
| Job Silence Watchdog  | SITE_BASE_URL                                                                               | Detect silent job failures    | Blocked until SITE_BASE_URL set |
| Ops Enable Alerts     | DATABASE_URL, SENDGRID_API_KEY, ALERTS_EMAIL_FROM, SITE_BASE_URL                            | Apply migration 005, e2e test | Manual-only                     |

---

## 7) Env Var Inventory

| Env Var                      | Files Referenced                                                     | In .env.example? | Purpose                  |
| ---------------------------- | -------------------------------------------------------------------- | ---------------- | ------------------------ |
| `DATABASE_URL`               | lib/db.ts, app/api/health/route.ts, scripts, workflows               | Y                | Postgres connection      |
| `EBAY_APP_ID`                | lib/ebay.ts, lib/ebayStorefront.ts, workflows                        | Y                | eBay API client ID       |
| `EBAY_CLIENT_SECRET`         | lib/ebay.ts, data-pipelines.yml                                      | Y                | eBay API client secret   |
| `EBAY_AFFILIATE_CAMPAIGN_ID` | lib/affiliateUrl.ts                                                  | Y                | eBay affiliate tracking  |
| `EBAY_AFFILIATE_CUSTOM_ID`   | lib/affiliateUrl.ts                                                  | Y                | eBay affiliate custom ID |
| `POKEMONTCG_IO_API_KEY`      | scripts/ingest_pokemon_sets.ts, scripts/import-pokemontcg-catalog.ts | Y                | Pokemon TCG API key      |
| `ADMIN_SECRET`               | lib/adminAuth.ts, app/api/admin/login/route.ts, app/admin/\*.tsx     | Y                | Admin auth secret        |
| `DEBUG_ADMIN_TOKEN`          | lib/debugAuth.ts, app/api/debug/overrides/route.ts                   | Y                | Debug page auth token    |
| `SENTRY_DSN`                 | instrumentation.ts                                                   | Y                | Sentry error tracking    |
| `SENDGRID_API_KEY`           | lib/emailQueue.ts, scripts/check-alerts.ts                           | Y                | Email sending            |
| `ALERTS_EMAIL_FROM`          | lib/emailQueue.ts, scripts/e2e-test-alerts.ts                        | Y                | Email sender address     |
| `SITE_BASE_URL`              | scripts/check-alerts.ts, job-silence-watchdog.yml                    | Y                | Base URL for links       |
| `OPEN_EXCHANGE_RATES_APP_ID` | data-pipelines.yml                                                   | Y                | FX rates API             |
| `NODE_ENV`                   | lib/db.ts, lib/debugAuth.ts, app/debug/\*.ts                         | N (standard)     | Environment mode         |
| `NEXT_RUNTIME`               | instrumentation.ts                                                   | N (Next.js)      | Runtime detection        |

### .env.example Coverage Proof (Historical)

Prior to PR #121, the following keys were NOT FOUND in .env.example:

```
grep -E "EBAY_CLIENT_SECRET|OPEN_EXCHANGE_RATES_APP_ID" .env.example
# Result: NOT FOUND
```

These keys were added in PR #121 (merged).

---

## 8) DB + Migrations Inventory

### Migration Files (12 files)

| File                                            | Purpose                           |
| ----------------------------------------------- | --------------------------------- |
| 001_add_fx_rates.sql                            | Add FX rates table                |
| 002_add_listing_integrity_fields.sql            | Add listing integrity fields      |
| 003_add_catalog_set_fields.sql                  | Add catalog set fields            |
| 004_add_seller_blacklist_history.sql            | Add seller blacklist history      |
| 005_add_subscription_last_emailed.sql           | Add subscription last_emailed_at  |
| 006_add_listings_card_id_idx.sql                | Add listings card_id index        |
| 007_add_rate_limits.sql                         | Add rate_limits table             |
| 009_option_a_fx_rate_runs.sql                   | Option A FX rate runs table       |
| 010_option_a_listings_snapshot_fx_precision.sql | Option A listings snapshot fields |
| 011_option_a_sold_fx_snapshot.sql               | Option A sold FX snapshot         |
| 012_option_a_historical_baseline_usd.sql        | Option A historical baseline USD  |
| 013_add_watchlist_entries.sql                   | Add watchlist_entries table       |

### Danger Ops Scripts (paths only)

| Path                                                       | Danger Type                  |
| ---------------------------------------------------------- | ---------------------------- |
| scripts/purge-blacklisted-listings.ts:117                  | DELETE FROM listings         |
| scripts/e2e-test-alerts.ts:162,165                         | DELETE FROM alerts_watchlist |
| scripts/migrations/20251215_drop_seller_store_name.sql     | DROP COLUMN                  |
| scripts/migrations/20251216_collector_number_hardening.sql | DROP CONSTRAINT              |
| scripts/migrations/20251219_add_market_partition.sql       | DROP CONSTRAINT              |

---

## 9) Dependency Inventory

### Dependencies

| Package        | Version  | Notes              |
| -------------- | -------- | ------------------ |
| @sentry/nextjs | ^10.32.1 | Error tracking     |
| @types/dotenv  | ^6.1.1   | Types              |
| cheerio        | ^1.1.2   | HTML parsing       |
| dotenv         | ^17.2.3  | Env loading        |
| next           | 14.2.35  | Framework (pinned) |
| pg             | ^8.11.5  | Postgres client    |
| react          | 18.3.1   | UI library         |
| react-dom      | 18.3.1   | React DOM          |
| recharts       | ^3.5.1   | Charts             |
| server-only    | ^0.0.1   | Server-only marker |

### Dev Dependencies

| Package              | Version   | Notes                 |
| -------------------- | --------- | --------------------- |
| @tailwindcss/postcss | ^4.1.18   | Tailwind v4 PostCSS   |
| @types/node          | ^20.11.30 | Types                 |
| @types/pg            | ^8.16.0   | Types                 |
| @types/react         | ^18.3.3   | Types                 |
| @types/react-dom     | ^18.3.0   | Types                 |
| eslint               | ^9.18.0   | Linting               |
| eslint-config-next   | ^15.1.6   | Next.js ESLint config |
| husky                | ^9.1.7    | Git hooks             |
| lint-staged          | ^16.2.7   | Pre-commit formatting |
| postcss              | ^8.5.6    | CSS processing        |
| prettier             | ^3.4.2    | Formatting            |
| tailwindcss          | ^4.1.18   | CSS framework         |
| ts-node              | ^10.9.2   | TS execution          |
| tsx                  | ^4.21.0   | TS execution (modern) |
| typescript           | ^5.4.5    | Types                 |

### Needs Confirmation Candidates

- `@types/dotenv` — May be unnecessary with modern dotenv
- `ts-node` — May be redundant with tsx
- `cheerio` — Verify still in use (storefront enrichment deprecated)

---

## Risks Identified

| #   | Risk                                                                                     | Path(s)                                                    | Severity |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| 1   | Component bloat — CardDetailClient.tsx (65KB) and DealsTable.tsx (63KB) are very large   | components/CardDetailClient.tsx, components/DealsTable.tsx | HIGH     |
| 2   | Danger ops script — purge-blacklisted-listings.ts can DELETE listings in production      | scripts/purge-blacklisted-listings.ts                      | HIGH     |
| 3   | Job silence watchdog blocked — Cannot detect silent job failures until SITE_BASE_URL set | .github/workflows/job-silence-watchdog.yml                 | MEDIUM   |
| 4   | Redundant devDeps — ts-node + tsx both present; @types/dotenv may be unnecessary         | package.json                                               | LOW      |
| 5   | cheerio may be dead code — storefront enrichment deprecated                              | package.json, lib/ebayStorefront.ts                        | LOW      |

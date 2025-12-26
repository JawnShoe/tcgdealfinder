# Full System Audit: Phase 3D — Ops, Pipelines & Alerts

**Audit Type**: READ-ONLY code analysis
**Scope**: GitHub Actions workflows, scheduled jobs, data pipelines, alerts subsystem, cleanup scripts
**Date**: 2025-12-26
**Auditor**: Claude Opus 4.5
**Branch Base**: `main` @ `1bd4f9022f5771b4a796247c1f70aa0ad6b23f08`

---

## Executive Summary

This audit documents all automation mechanisms, scheduled jobs, data pipelines, and the email alerts subsystem. The system uses GitHub Actions for all scheduled automation with no external orchestration. Data flows are well-structured with idempotent pipelines. The alerts subsystem is fully implemented but email sending is disabled by default pending operator configuration.

**Key Finding**: The automation layer is robust with proper failure isolation. No data corruption risks identified. Manual operator intervention is required to enable email alerts.

---

## 1. Automation Inventory

### 1.1 GitHub Actions Workflows

| File                                          | Purpose                             | Trigger Type               |
| --------------------------------------------- | ----------------------------------- | -------------------------- |
| `.github/workflows/ci.yml`                    | Lint, test, build on push/PR        | Event (push/PR to main)    |
| `.github/workflows/data-pipelines.yml`        | Data refresh jobs                   | Scheduled + Manual         |
| `.github/workflows/dependabot-auto-merge.yml` | Auto-merge safe updates             | Event (PR from Dependabot) |
| `.github/workflows/ops-enable-alerts.yml`     | Alerts enablement operator workflow | Manual only                |

### 1.2 Scheduled Jobs Summary

| Job                        | Schedule                      | Timeout | Status   |
| -------------------------- | ----------------------------- | ------- | -------- |
| `update-listings`          | `*/30 * * * *` (every 30 min) | 25 min  | Active   |
| `check-alerts`             | Manual only\*                 | 10 min  | Disabled |
| `update-historical-prices` | `0 3 * * *` (daily 3 AM UTC)  | 30 min  | Active   |
| `update-sold-listings`     | `0 4 * * *` (daily 4 AM UTC)  | 45 min  | Active   |
| `show-fx-rates`            | Manual only                   | 5 min   | Manual   |

_`check-alerts` schedule (`_/15 \* \* \* \*`) is commented out pending SENDGRID_API_KEY configuration.

### 1.3 No External Schedulers

- No cron jobs outside GitHub Actions
- No AWS Lambda / CloudWatch scheduled events
- No external task queues (Celery, Bull, etc.)
- All automation is contained within `.github/workflows/`

---

## 2. Workflow-by-Workflow Details

### 2.1 CI Workflow (`ci.yml`)

**Trigger**: Push to main, PR targeting main
**Jobs**: `lint-and-build`
**Timeout**: Default (6 hours)

**Steps**:

1. Checkout code (fetch-depth: 0 for full history)
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Cache Next.js build (`.next/cache`)
5. Check formatting on changed files only (Prettier)
6. Run lint (`npm run lint`)
7. Run unit tests (`npm run test:unit`)
8. Run build (`npm run build`)

**Permissions**: `contents: read`
**Secrets Used**: None (build runs without DATABASE_URL)

### 2.2 Data Pipelines Workflow (`data-pipelines.yml`)

**Trigger**: Multiple cron schedules + `workflow_dispatch`
**Concurrency**: `data-pipelines-${{ schedule | job | 'manual' }}` (no cancel-in-progress)
**Permissions**: `contents: read`

**Global Environment Variables**:

```yaml
DATABASE_URL: ${{ secrets.DATABASE_URL }}
EBAY_APP_ID: ${{ secrets.EBAY_APP_ID }}
EBAY_CLIENT_ID: ${{ secrets.EBAY_APP_ID }} # Alias
EBAY_CLIENT_SECRET: ${{ secrets.EBAY_CLIENT_SECRET }}
SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
```

#### Job: `update-listings`

- **Schedule**: `*/30 * * * *`
- **Script**: `npm run listings:update` → `tsx scripts/update-listings.ts`
- **DB Operations**:
  - READ: `card_search_config`, `cards`, `seller_blacklist`, `historical_prices`
  - WRITE: `listings`, `rejected_listings`, `seller_blacklist` (auto-blacklist), `card_search_config`
- **External APIs**: eBay Browse API, eBay Storefront API
- **Failure Mode**: Process exits with error, job fails, no data corruption

#### Job: `check-alerts`

- **Schedule**: Disabled (manual `workflow_dispatch` only)
- **Script**: `npm run alerts:check` → `tsx scripts/check-alerts.ts`
- **DB Operations**:
  - READ: `alerts_watchlist`, `listings`, `cards`, `seller_blacklist`, `email_subscriptions`
  - WRITE: `alerts_log`, `alerts_watchlist` (last_triggered_at), `email_subscriptions` (last_emailed_at)
- **External APIs**: SendGrid (if SENDGRID_API_KEY set)
- **Failure Mode**: Graceful skip if no SENDGRID_API_KEY; errors logged but job continues

#### Job: `update-historical-prices`

- **Schedule**: `0 3 * * *` (daily 3 AM UTC)
- **Script**: `npm run historicals:update` → `tsx scripts/update-historical-prices.ts`
- **DB Operations**:
  - READ: `ebay_sold_listings`, `cards`
  - WRITE: `historical_prices` (upsert)
- **Logic**: Aggregates sold listings from last 365 days, computes median per (card_id, market), requires min 5 samples
- **Failure Mode**: No update if no sold data; job fails on DB error

#### Job: `update-sold-listings`

- **Schedule**: `0 4 * * *` (daily 4 AM UTC)
- **Script**: `npm run sold:update` → `ts-node --esm scripts/update-sold-listings.ts`
- **DB Operations**:
  - READ: `card_search_config`, `cards`
  - WRITE: `ebay_sold_listings` (insert)
- **External APIs**: eBay completed listings API
- **Failure Mode**: Individual insert errors logged, continues with next card

#### Job: `show-fx-rates`

- **Schedule**: Manual only
- **Script**: `npx tsx scripts/update-fx-rates.ts`
- **Purpose**: Display current FX rates (no DB write without CLI args)
- **Note**: Rate updates require manual input: `--currency CAD --rate 0.72`

### 2.3 Dependabot Auto-Merge (`dependabot-auto-merge.yml`)

**Trigger**: PR from `dependabot[bot]`
**Permissions**: `contents: write`, `pull-requests: write`

**Logic**:

1. Fetch Dependabot metadata
2. Check update type (patch/minor vs major)
3. If patch/minor: Enable auto-merge (squash)
4. If major: Comment requiring manual review

**Safety**: Only auto-merges after CI passes (required `Lint & Build` check)

### 2.4 Ops Enable Alerts (`ops-enable-alerts.yml`)

**Trigger**: Manual `workflow_dispatch` only
**Concurrency**: `ops-enable-alerts` (no cancel-in-progress)
**Permissions**: `contents: read`

**Modes**:

| Mode             | Confirm String         | Purpose                            |
| ---------------- | ---------------------- | ---------------------------------- |
| `migrate`        | `APPLY_MIGRATION_005`  | Apply email subscription migration |
| `smoke_test`     | (none)                 | Run check-alerts in test mode      |
| `e2e_test_email` | `SEND_REAL_TEST_EMAIL` | Full E2E test with real email      |

**Required Inputs for E2E**:

- `confirm`: `SEND_REAL_TEST_EMAIL`
- `test_email`: Email address to receive test

**Security**:

- Confirmation strings prevent accidental execution
- E2E mode requires all 4 email secrets
- Test data auto-cleaned after E2E run

---

## 3. Data Pipelines End-to-End

### 3.1 Listings Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    update-listings (every 30 min)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Load card_search_config (active configs)                        │
│     ↓                                                               │
│  2. Load seller_blacklist into memory                               │
│     ↓                                                               │
│  3. For each (card, market) pair:                                   │
│     a. Fetch historical_price for discount calc                     │
│     b. Call eBay Browse API (fetchEbayListings)                     │
│     c. For each listing:                                            │
│        - Extract collector number, language, grade                  │
│        - Check blacklist, banned keywords, currency mismatch        │
│        - Compute discount, integrity score                          │
│        - Fetch storefront info (if missing seller_store_name)       │
│        - UPSERT into listings table                                 │
│        - Log rejected listings to rejected_listings                 │
│     d. Auto-blacklist sellers with >70% invalid rate (min 20)       │
│     ↓                                                               │
│  4. Complete (or error exit)                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Sources**: eBay Browse API, eBay Storefront (HTML scrape)
**Data Sinks**: `listings`, `rejected_listings`, `seller_blacklist`, `card_search_config`

### 3.2 Sold Listings Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                   update-sold-listings (daily 4 AM)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Load card_search_config (active configs)                        │
│     ↓                                                               │
│  2. For each (card_id, condition, market):                          │
│     a. Call eBay completed listings API                             │
│     b. Filter valid titles (isValidListingTitle)                    │
│     c. INSERT into ebay_sold_listings (no upsert, append-only)      │
│     ↓                                                               │
│  3. Complete with total count                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Sources**: eBay completed/sold API
**Data Sinks**: `ebay_sold_listings`

### 3.3 Historical Prices Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                update-historical-prices (daily 3 AM)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Query ebay_sold_listings (last 365 days, min 5 samples)         │
│     - Group by (card_id, condition, language, market)               │
│     - Compute PERCENTILE_CONT(0.5) = median                         │
│     ↓                                                               │
│  2. UPSERT into historical_prices                                   │
│     - Key: (card_id, market)                                        │
│     - Value: median_price_cad, sample_size, last_updated_at         │
│     ↓                                                               │
│  3. Complete with count                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Sources**: `ebay_sold_listings`, `cards`
**Data Sinks**: `historical_prices`

---

## 4. Alerts System End-to-End

### 4.1 Subscription Flow

```
User (card detail page)
    ↓ POST /api/alerts/subscribe
    ↓ { cardId, email, minDiscountPercent }
    ↓
Rate Limit Check (lib/rateLimit.ts)
    ↓ 5 requests / 5 minutes / IP
    ↓
createOrUpdateSubscription (lib/emailSubscriptions.ts)
    ↓ UPSERT email_subscriptions
    ↓ confirmed_at = NOW()
    ↓
Response { success: true, subscription }
```

### 4.2 Alert Check Flow

```
check-alerts.ts (scheduled or manual)
    ↓
1. fetchActiveWatches()
   - SELECT from alerts_watchlist WHERE active = TRUE
    ↓
2. For each watch:
   a. fetchBestListing(card_id, condition)
      - Filters: seller feedback >= 20, positive >= 98%
      - Excludes: blacklisted sellers
      - ORDER BY total_price_cad ASC LIMIT 1
    ↓
   b. Evaluate threshold (price_below OR discount_at_least)
    ↓
   c. Check cooldown (6 hours since last_triggered_at)
    ↓
   d. If conditions met:
      - insertAlert() → alerts_log
      - updateWatchChecked() → last_triggered_at
      - notifyEmailSubscribers() → SendGrid
    ↓
3. Complete
```

### 4.3 Email Sending Flow

```
notifyEmailSubscribers (check-alerts.ts)
    ↓
1. Skip if SENDGRID_API_KEY not set
    ↓
2. getActiveSubscriptionsForCard()
   - Filter: unsubscribed_at IS NULL
   - Filter: confirmed_at IS NOT NULL
   - Filter: min_discount_percent <= current_discount
   - Filter: last_emailed_at < NOW() - 6 hours
    ↓
3. For each subscription:
   a. Build email (text + HTML)
   b. queueAlertEmail() → SendGrid API POST
   c. markSubscriptionEmailed() → last_emailed_at
   d. Log success
```

### 4.4 Unsubscribe Flow

```
User clicks unsubscribe link
    ↓ GET /api/alerts/unsubscribe?token={uuid}
    ↓
unsubscribeByToken (lib/emailSubscriptions.ts)
    ↓ UPDATE email_subscriptions SET unsubscribed_at = NOW()
    ↓ WHERE unsubscribe_token = $1
    ↓
Redirect to confirmation page
```

### 4.5 Email Security

- **RFC 8058 Compliance**: `List-Unsubscribe` and `List-Unsubscribe-Post` headers (`lib/emailQueue.ts:22-28`)
- **Cooldown**: 6-hour per-subscription cooldown (`lib/emailSubscriptions.ts:31`, `scripts/check-alerts.ts:14`)
- **Token-based unsubscribe**: UUID in URL, no email in URL (`lib/emailSubscriptions.ts:122-136`)
- **Rate limiting**: 5 requests / 5 minutes / IP (`lib/rateLimit.ts:7-8`)

---

## 5. Failure Modes & Recovery

### 5.1 Pipeline Failure Scenarios

| Scenario                   | Impact                    | Recovery                        |
| -------------------------- | ------------------------- | ------------------------------- |
| eBay API rate limit        | Job fails, listings stale | Automatic retry next schedule   |
| eBay API auth failure      | Job fails early           | Rotate EBAY_CLIENT_SECRET       |
| DB connection failure      | Job fails, no writes      | Check DATABASE_URL, Neon status |
| Single listing parse error | Logged, continues         | Review rejected_listings        |
| SendGrid API error         | Email not sent, logged    | Check SendGrid dashboard        |

### 5.2 Data Integrity Guarantees

- **Listings**: UPSERT with `ON CONFLICT (listing_id, market)` — idempotent
- **Historical prices**: UPSERT with `ON CONFLICT (card_id, market)` — idempotent
- **Sold listings**: INSERT only (append log) — no duplicates by design (new run = new data)
- **Alerts**: INSERT-only log, no destructive updates

### 5.3 Concurrency Protection

From `data-pipelines.yml`:

```yaml
concurrency:
  group: data-pipelines-${{ github.event.schedule || github.event.inputs.job || 'manual' }}
  cancel-in-progress: false
```

Each schedule triggers a different concurrency group → parallel runs won't conflict.

### 5.4 Notification on Failure

- GitHub Actions sends email to repo watchers on workflow failure
- Operator must enable "Workflows" in repository watch settings
- See `docs/ENV_RUNBOOK.md` § "Scheduled Job Failure Alerting"

---

## 6. Cleanup & Maintenance Scripts

### 6.1 Rate Limit Cleanup

Location: `lib/rateLimit.ts:105-113`

```typescript
// Opportunistic cleanup: 1% chance per request
if (Math.random() < 0.01) {
  query(
    `DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour'`
  ).catch(() => {
    /* ignore */
  });
}
```

**Frequency**: ~1% of rate-limited requests
**Retention**: 1 hour

### 6.2 Blacklist Purge Script

Location: `scripts/purge-blacklisted-listings.ts`

**Purpose**: Remove listings matching blacklist criteria
**Usage**:

```bash
npx tsx scripts/purge-blacklisted-listings.ts         # Dry run
npx tsx scripts/purge-blacklisted-listings.ts --delete # Actual delete
```

**Not Scheduled**: Manual operator action only

### 6.3 E2E Test Cleanup

Location: `scripts/e2e-test-alerts.ts:156-177`

**Automatic cleanup**:

- Deletes test watch by ID
- Deletes orphaned test watches by marker
- Marks test subscription as unsubscribed (if created)

---

## 7. Operator Runbook Reference

### 7.1 Enable Email Alerts

1. Set secrets: `SENDGRID_API_KEY`, `ALERTS_EMAIL_FROM`, `SITE_BASE_URL`
2. Run workflow: `ops-enable-alerts.yml` → mode=migrate, confirm=APPLY_MIGRATION_005
3. Run E2E test: mode=e2e_test_email, confirm=SEND_REAL_TEST_EMAIL, test_email=<your email>
4. Verify email received
5. Enable schedule in `data-pipelines.yml` (uncomment `check-alerts` schedule trigger)

### 7.2 Monitor Pipeline Health

```bash
# GitHub CLI
gh run list --workflow=data-pipelines.yml --status=failure

# Or via GitHub UI
# Actions → Data Pipelines → Filter: failure
```

### 7.3 Manual Pipeline Trigger

```bash
gh workflow run data-pipelines.yml -f job=update-listings
gh workflow run data-pipelines.yml -f job=all  # Run all jobs
```

### 7.4 Check FX Rates

```bash
gh workflow run data-pipelines.yml -f job=show-fx-rates
# View output in Actions log
```

---

## 8. Open Questions

1. **Sold listings deduplication**: `ebay_sold_listings` is append-only with no dedup constraint. Running `update-sold-listings` twice may insert duplicates. Consider adding unique constraint on `(market, listing_id)` or dedup on insert.

2. **Rate limit table growth**: Opportunistic cleanup may lag behind high-volume traffic. Consider scheduled cleanup job or TTL-based partitioning.

3. **Alert check frequency**: Currently manual-only. When enabled, 15-minute schedule may be aggressive for low-volume subscriptions.

---

## Evidence Packet

### Files Examined

| File                                          | Purpose                  |
| --------------------------------------------- | ------------------------ |
| `.github/workflows/ci.yml`                    | CI pipeline              |
| `.github/workflows/data-pipelines.yml`        | Scheduled data jobs      |
| `.github/workflows/dependabot-auto-merge.yml` | Dependabot handling      |
| `.github/workflows/ops-enable-alerts.yml`     | Alerts enablement        |
| `scripts/update-listings.ts`                  | Listings refresh script  |
| `scripts/update-historical-prices.ts`         | Historical prices script |
| `scripts/update-sold-listings.ts`             | Sold listings script     |
| `scripts/check-alerts.ts`                     | Alerts check script      |
| `scripts/e2e-test-alerts.ts`                  | E2E test for alerts      |
| `scripts/purge-blacklisted-listings.ts`       | Cleanup script           |
| `lib/emailQueue.ts`                           | SendGrid integration     |
| `lib/emailSubscriptions.ts`                   | Subscription CRUD        |
| `lib/rateLimit.ts`                            | Rate limiting            |
| `docs/ENV_RUNBOOK.md`                         | Operator documentation   |

### Commands Run

```bash
ls -la .github/workflows
rg "schedule:|cron:" .github/workflows -n
rg "SENDGRID|email|mail|alert" -iS
rg "prune|cleanup|delete" -iS
```

---

## Verification Checklist

- [x] READ-ONLY: No code changes, only documentation added
- [x] All workflows inventoried (4 total)
- [x] All scheduled jobs documented (5 total)
- [x] Data pipelines traced end-to-end (3 pipelines)
- [x] Alerts system documented end-to-end
- [x] Failure modes analyzed
- [x] Cleanup mechanisms documented
- [x] Operator runbook references included

---

**LOCKED**: This audit is strictly documentation. No code modifications.

**VERIFIED**: All automation is contained in `.github/workflows/`. No external schedulers.

**REGRESSION**: None. Documentation-only change.

**OPEN QUESTIONS**: 3 items noted for future consideration (§8).

---

**SAFE TO MERGE** — Documentation-only, no runtime impact.

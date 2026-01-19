# M08: GitHub Workflows Review

**Module**: M08 — .github/workflows/
**Status**: REVIEW COMPLETE
**Date**: 2025-12-31

---

## 1) Inventory

### Workflow Summary

| Workflow                    | File                        | Triggers                                   | PR-Gating? |
| --------------------------- | --------------------------- | ------------------------------------------ | ---------- |
| CI                          | `ci.yml`                    | `pull_request`                             | YES        |
| Data Pipelines              | `data-pipelines.yml`        | `schedule` (5 crons), `workflow_dispatch`  | No         |
| Dependabot Auto-Merge       | `dependabot-auto-merge.yml` | `pull_request` (main)                      | No         |
| Job Silence Watchdog        | `job-silence-watchdog.yml`  | `schedule` (every 2h), `workflow_dispatch` | No         |
| Ops Enablement - Alerts MVP | `ops-enable-alerts.yml`     | `workflow_dispatch` only                   | No         |

---

### Detailed Workflow Analysis

#### 1. CI (`ci.yml`)

**Purpose**: PR gating — runs lint, unit tests, and build on every pull request.

| Attribute        | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| **Triggers**     | `pull_request`                                                              |
| **Permissions**  | `contents: read`, `pull-requests: read` (minimal, read-only)                |
| **Concurrency**  | `ci-${{ workflow }}-${{ pr_number \|\| ref }}`, cancel-in-progress          |
| **Timeout**      | None specified (uses GitHub default: 6 hours)                               |
| **Caching**      | npm cache via `actions/setup-node`, Next.js build cache via `actions/cache` |
| **Secrets**      | None                                                                        |
| **Environments** | None                                                                        |
| **Matrix**       | None                                                                        |
| **Artifacts**    | None                                                                        |

**Jobs**:

- `lint-and-build`: Detects docs-only PRs and skips full CI; otherwise runs Prettier, ESLint, unit tests, and build.

**Required Check**: YES — "Lint & Build" gates PR merges.

**Docs-Only Optimization**: Uses `dorny/paths-filter@v3` to detect docs-only changes (`**/*.md`, `docs/**`) and skip CI steps.

---

#### 2. Data Pipelines (`data-pipelines.yml`)

**Purpose**: Scheduled data refresh — updates listings, prices, FX rates, alerts.

| Attribute        | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| **Triggers**     | `schedule` (5 crons), `workflow_dispatch` (manual with job selector)                                  |
| **Permissions**  | `contents: read` (minimal)                                                                            |
| **Concurrency**  | `data-pipelines-${{ schedule \|\| input }}`, no cancel-in-progress                                    |
| **Timeouts**     | Per-job: 25m, 10m, 5m, 5m, 30m, 45m (all specified)                                                   |
| **Caching**      | npm cache via `actions/setup-node`                                                                    |
| **Secrets Used** | `DATABASE_URL`, `EBAY_APP_ID`, `EBAY_CLIENT_SECRET`, `OPEN_EXCHANGE_RATES_APP_ID`, `SENDGRID_API_KEY` |
| **Environments** | None                                                                                                  |
| **Matrix**       | None                                                                                                  |
| **Artifacts**    | None                                                                                                  |

**Schedule Details**:
| Cron | Job | Frequency |
| ----------------- | ------------------------ | ---------------- |
| `*/30 * * * *` | update-listings | Every 30 minutes |
| `*/15 * * * *` | check-alerts | Every 15 minutes (currently disabled in condition) |
| `0 3 * * *` | update-historical-prices | Daily at 3 AM UTC |
| `0 4 * * *` | update-sold-listings | Daily at 4 AM UTC |
| `0 * * * *` | update-fx-rates | Hourly |

**Jobs**:

- `update-listings`: Fetches new eBay listings
- `check-alerts`: Checks price alerts (manual-only until SENDGRID configured)
- `show-fx-rates`: Display-only FX rates (manual)
- `update-fx-rates`: Automated FX rate updates from Open Exchange Rates
- `update-historical-prices`: Updates historical price data
- `update-sold-listings`: Updates sold listing data

**Note**: All jobs have explicit `timeout-minutes` set. Fork guard mentioned in comments.

---

#### 3. Dependabot Auto-Merge (`dependabot-auto-merge.yml`)

**Purpose**: Auto-merge safe (patch/minor) Dependabot PRs after CI passes.

| Attribute        | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| **Triggers**     | `pull_request` (branches: main)                                     |
| **Permissions**  | `contents: write`, `pull-requests: write` (required for auto-merge) |
| **Concurrency**  | None specified                                                      |
| **Timeout**      | None specified                                                      |
| **Caching**      | None                                                                |
| **Secrets Used** | `GITHUB_TOKEN` (implicit)                                           |
| **Environments** | None                                                                |
| **Matrix**       | None                                                                |
| **Artifacts**    | None                                                                |

**Jobs**:

- `auto-merge`: Only runs for `dependabot[bot]` actor; checks semver type; enables auto-merge for patch/minor; comments on major updates.

**Behavior**:

- Patch/minor: `gh pr merge --auto --squash`
- Major: Adds comment requiring manual review

---

#### 4. Job Silence Watchdog (`job-silence-watchdog.yml`)

**Purpose**: Monitors data pipeline health by checking if scheduled jobs are running.

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **Triggers**     | `schedule` (every 2 hours: `0 */2 * * *`), `workflow_dispatch` |
| **Permissions**  | `contents: read` (minimal)                                     |
| **Concurrency**  | None specified                                                 |
| **Timeout**      | 5 minutes (specified)                                          |
| **Caching**      | None                                                           |
| **Secrets Used** | `SITE_BASE_URL` (for health endpoint)                          |
| **Environments** | None                                                           |
| **Matrix**       | None                                                           |
| **Artifacts**    | None                                                           |

**Jobs**:

- `check-freshness`: Fetches `/api/health`, checks listings freshness (2h threshold), checks historical prices freshness (26h threshold).

**Alert Thresholds**:

- Listings: 2 hours (4 missed runs of 30-min job)
- Historical prices: 26 hours (2h buffer past daily schedule)

---

#### 5. Ops Enablement - Alerts MVP (`ops-enable-alerts.yml`)

**Purpose**: Operator workflow for enabling email alerts subsystem (migration, smoke test, E2E test).

| Attribute        | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| **Triggers**     | `workflow_dispatch` only (manual)                                        |
| **Permissions**  | `contents: read` (minimal)                                               |
| **Concurrency**  | `ops-enable-alerts`, no cancel-in-progress                               |
| **Timeouts**     | 5m (migrate), 10m (smoke), 10m (e2e)                                     |
| **Caching**      | npm cache via `actions/setup-node`                                       |
| **Secrets Used** | `DATABASE_URL`, `SENDGRID_API_KEY`, `ALERTS_EMAIL_FROM`, `SITE_BASE_URL` |
| **Environments** | None                                                                     |
| **Matrix**       | None                                                                     |
| **Artifacts**    | None                                                                     |

**Jobs**:

- `migrate`: Applies migration 005 (requires confirmation string)
- `smoke-test`: Runs alerts check in dry-run mode
- `e2e-test-email`: Sends real test emails (requires confirmation + email allowlist)

**Security**: Requires explicit confirmation strings; test emails restricted to allowlist.

---

## 2) Risk Analysis

### R1: CI Workflow Missing Timeout (LOW)

- **Path**: `.github/workflows/ci.yml`
- **Issue**: No `timeout-minutes` specified; defaults to GitHub's 6-hour maximum
- **Impact**: Stuck CI job could consume 6 hours of Actions minutes
- **Severity**: LOW (concurrency group cancels previous runs; unlikely to accumulate)
- **Recommendation**: Add explicit timeout for predictability

### R2: Dependabot Auto-Merge Missing Concurrency (LOW)

- **Path**: `.github/workflows/dependabot-auto-merge.yml`
- **Issue**: No concurrency group; multiple Dependabot PRs could trigger parallel runs
- **Impact**: Minimal — each run is independent and fast
- **Severity**: LOW
- **Recommendation**: Not urgent; each run is isolated

### R3: Dependabot Auto-Merge Missing Timeout (LOW)

- **Path**: `.github/workflows/dependabot-auto-merge.yml`
- **Issue**: No `timeout-minutes` specified
- **Impact**: Low risk — workflow only runs shell commands, no build steps
- **Severity**: LOW
- **Recommendation**: Add explicit timeout for consistency

### R4: Job Silence Watchdog Missing Concurrency (LOW)

- **Path**: `.github/workflows/job-silence-watchdog.yml`
- **Issue**: No concurrency group; overlapping scheduled runs theoretically possible
- **Impact**: Minimal — runs every 2 hours, job completes in <1 minute
- **Severity**: LOW
- **Recommendation**: Not urgent

### R5: Write Permissions on Dependabot Auto-Merge (ACCEPTABLE)

- **Path**: `.github/workflows/dependabot-auto-merge.yml`
- **Issue**: `contents: write` + `pull-requests: write` permissions
- **Impact**: Required for auto-merge functionality; restricted to `dependabot[bot]` actor
- **Severity**: ACCEPTABLE (intentional, guarded by actor check)
- **Recommendation**: None — correctly scoped

---

## 3) Hardening Opportunities

### MUST (Required for correctness)

None identified — all workflows are functional and secure.

### SHOULD (Recommended hardening)

| ID  | Description                         | Path                                          | Effort | Risk |
| --- | ----------------------------------- | --------------------------------------------- | ------ | ---- |
| S1  | Add explicit timeout to CI workflow | `.github/workflows/ci.yml`                    | Tiny   | LOW  |
| S2  | Add explicit timeout to Dependabot  | `.github/workflows/dependabot-auto-merge.yml` | Tiny   | LOW  |

### LATER (Deferred — minimal impact)

| ID  | Description                              | Notes                         |
| --- | ---------------------------------------- | ----------------------------- |
| L1  | Add concurrency to dependabot-auto-merge | Low priority; runs are fast   |
| L2  | Add concurrency to job-silence-watchdog  | Low priority; 2h schedule gap |

---

## 4) Governance Assessment

### Permissions Review

| Workflow              | Permissions                               | Assessment               |
| --------------------- | ----------------------------------------- | ------------------------ |
| ci.yml                | `contents: read`, `pull-requests: read`   | ✅ Minimal               |
| data-pipelines.yml    | `contents: read`                          | ✅ Minimal               |
| dependabot-auto-merge | `contents: write`, `pull-requests: write` | ✅ Required for function |
| job-silence-watchdog  | `contents: read`                          | ✅ Minimal               |
| ops-enable-alerts     | `contents: read`                          | ✅ Minimal               |

**Result**: All workflows follow least-privilege principle.

### Secrets Exposure Review

- No secrets printed to logs (verified in all workflows)
- Secret verification steps only confirm presence, not value
- DATABASE_URL and API keys properly scoped to jobs that need them

### Branch Protection Implications

- **CI (`ci.yml`)**: "Lint & Build" job is the required check for PR merges
- **Dependabot Auto-Merge**: Respects required checks; only enables auto-merge after CI passes

---

## 5) Acceptance Criteria

- [x] All workflows inventoried (5 total)
- [x] Triggers documented (push/PR/schedule/dispatch)
- [x] Permissions reviewed (all minimal or justified)
- [x] Secrets usage documented
- [x] Timeouts reviewed (4/5 have explicit timeouts)
- [x] Concurrency reviewed (3/5 have concurrency groups)
- [x] Caching documented
- [x] Required check implications documented
- [x] Risks documented (5 low-severity items)
- [x] Hardening opportunities identified

---

## 6) Hardening Decision

**Assessment**: The identified hardening opportunities (S1, S2) are minor improvements for consistency and predictability. They involve adding explicit timeouts to two workflows that currently rely on GitHub's 6-hour default.

**Decision**: PROCEED with minimal hardening PR to add explicit timeouts to:

1. `ci.yml` — add `timeout-minutes: 15` (lint + test + build should complete well under this)
2. `dependabot-auto-merge.yml` — add `timeout-minutes: 5` (only runs metadata fetch + gh commands)

This is a safe, minimal change that:

- Does NOT affect required check semantics
- Does NOT change branch protection behavior
- Does NOT modify job logic
- Adds predictability and prevents runaway Actions minute consumption

---

## 7) PR(s)

_To be updated after hardening PR is opened._

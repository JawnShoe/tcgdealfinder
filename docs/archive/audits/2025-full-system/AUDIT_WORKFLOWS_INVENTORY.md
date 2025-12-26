> **Archived after Full System Audit closeout (2025-12-26)**

# Audit Artifact (Archived)

**Phase**: 1 — Inventory
**Created**: 2025-12-26
**Archived**: 2025-12-26

---

# Workflows & Automation Inventory

---

## GitHub Actions Workflows

### 1. CI Workflow

| Attribute                  | Value                                  |
| -------------------------- | -------------------------------------- |
| **File**                   | `.github/workflows/ci.yml`             |
| **Name**                   | CI                                     |
| **Trigger**                | Push to `main`, Pull Request to `main` |
| **Purpose**                | Lint, test, and build verification     |
| **Touches DB?**            | No                                     |
| **Produces Side Effects?** | No (read-only verification)            |

**Steps**:

1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Cache Next.js build
5. Check formatting (changed files only)
6. Run lint (`npm run lint`)
7. Run unit tests (`npm run test:unit`)
8. Run build (`npm run build`)

**Notes**:

- Required status check for branch protection on `main`
- Does not require DATABASE_URL (build works without it)

---

### 2. Data Pipelines Workflow

| Attribute                  | Value                                                           |
| -------------------------- | --------------------------------------------------------------- |
| **File**                   | `.github/workflows/data-pipelines.yml`                          |
| **Name**                   | Data Pipelines                                                  |
| **Trigger**                | Scheduled (cron) + Manual dispatch                              |
| **Purpose**                | Automated data refresh for listings, prices, sold items, alerts |
| **Touches DB?**            | Yes                                                             |
| **Produces Side Effects?** | Yes (writes to database, may send emails)                       |

**Scheduled Jobs**:

| Job                        | Cron                          | Purpose               | DB Write? | Side Effects |
| -------------------------- | ----------------------------- | --------------------- | --------- | ------------ |
| `update-listings`          | `*/30 * * * *` (every 30 min) | Refresh eBay listings | Yes       | None         |
| `check-alerts`             | `*/15 * * * *` (disabled)     | Process email alerts  | Yes       | Sends emails |
| `update-historical-prices` | `0 3 * * *` (3 AM UTC daily)  | Update price history  | Yes       | None         |
| `update-sold-listings`     | `0 4 * * *` (4 AM UTC daily)  | Update sold status    | Yes       | None         |
| `show-fx-rates`            | Manual only                   | Display FX rates      | No        | None         |

**Notes**:

- `check-alerts` is currently disabled in schedule (manual dispatch only)
- FX rate updates require manual CLI input (not automated)
- Concurrency control prevents parallel runs of same job
- Secrets required: DATABASE_URL, EBAY_APP_ID, EBAY_CLIENT_SECRET

---

### 3. Dependabot Auto-Merge Workflow

| Attribute                  | Value                                            |
| -------------------------- | ------------------------------------------------ |
| **File**                   | `.github/workflows/dependabot-auto-merge.yml`    |
| **Name**                   | Dependabot Auto-Merge                            |
| **Trigger**                | Pull Request to `main` (Dependabot only)         |
| **Purpose**                | Auto-merge safe (patch/minor) dependency updates |
| **Touches DB?**            | No                                               |
| **Produces Side Effects?** | Yes (merges PRs, comments on major updates)      |

**Logic**:

- Only runs for `dependabot[bot]` actor
- Fetches Dependabot metadata
- Patch/minor updates: enables auto-merge (squash)
- Major updates: comments with manual review requirement

**Notes**:

- Waits for "Lint & Build" required check to pass
- Major updates require manual migration PR

---

### 4. Ops Enable Alerts Workflow

| Attribute                  | Value                                                  |
| -------------------------- | ------------------------------------------------------ |
| **File**                   | `.github/workflows/ops-enable-alerts.yml`              |
| **Name**                   | Ops Enablement - Alerts MVP                            |
| **Trigger**                | Manual dispatch only                                   |
| **Purpose**                | Apply migration 005, smoke test alerts, E2E email test |
| **Touches DB?**            | Yes (migration mode)                                   |
| **Produces Side Effects?** | Yes (applies migration, sends test emails)             |

**Modes**:

| Mode             | Purpose                  | Confirmation Required  | Side Effects                   |
| ---------------- | ------------------------ | ---------------------- | ------------------------------ |
| `migrate`        | Apply migration 005      | `APPLY_MIGRATION_005`  | DB schema change               |
| `smoke_test`     | Run check-alerts dry run | None                   | None (or emails if configured) |
| `e2e_test_email` | Send real test email     | `SEND_REAL_TEST_EMAIL` | Sends email to allowlist       |

**Notes**:

- Confirmation strings prevent accidental execution
- Test emails restricted to allowlist
- Concurrency group prevents parallel ops runs

---

## Dependabot Configuration

| Attribute      | Value                           |
| -------------- | ------------------------------- |
| **File**       | `.github/dependabot.yml`        |
| **Purpose**    | Automated dependency update PRs |
| **Ecosystems** | npm, github-actions             |
| **Schedule**   | Weekly                          |
| **PR Limit**   | 5 open PRs max                  |

---

## Git Hooks (Husky)

### Pre-commit Hook

| Attribute                  | Value                                          |
| -------------------------- | ---------------------------------------------- |
| **File**                   | `.husky/pre-commit`                            |
| **Purpose**                | Format staged files and run lint before commit |
| **Touches DB?**            | No                                             |
| **Produces Side Effects?** | Yes (modifies staged files with formatting)    |

**Steps**:

1. `npm run format:staged` (lint-staged → prettier --write)
2. `npm run lint`

**Notes**:

- Uses lint-staged configuration in package.json
- Incremental enforcement (only changed files)

---

## npm Scripts (Scheduled/Automation-Related)

| Script               | Command                                                                    | Purpose               | Used By            |
| -------------------- | -------------------------------------------------------------------------- | --------------------- | ------------------ |
| `listings:update`    | `tsx scripts/update-listings.ts`                                           | Refresh eBay listings | data-pipelines.yml |
| `alerts:check`       | `tsx scripts/check-alerts.ts`                                              | Process email alerts  | data-pipelines.yml |
| `historicals:update` | `tsx scripts/update-historical-prices.ts`                                  | Update price history  | data-pipelines.yml |
| `sold:update`        | `ts-node --esm scripts/update-sold-listings.ts`                            | Update sold listings  | data-pipelines.yml |
| `test:unit`          | `tsx --test lib/__tests__/unit/*.test.ts scripts/__tests__/unit/*.test.ts` | Run unit tests        | ci.yml             |

---

## Summary

| Workflow                     | Trigger Type | Writes to DB | Sends External Requests | Enabled  |
| ---------------------------- | ------------ | ------------ | ----------------------- | -------- |
| CI                           | Push/PR      | No           | No                      | Yes      |
| Data Pipelines - listings    | Cron (30m)   | Yes          | Yes (eBay API)          | Yes      |
| Data Pipelines - alerts      | Manual only  | Yes          | Yes (SendGrid)          | Disabled |
| Data Pipelines - historicals | Cron (daily) | Yes          | No                      | Yes      |
| Data Pipelines - sold        | Cron (daily) | Yes          | Yes (eBay API)          | Yes      |
| Data Pipelines - fx          | Manual only  | No           | No                      | N/A      |
| Dependabot Auto-Merge        | PR           | No           | No                      | Yes      |
| Ops Enable Alerts            | Manual only  | Yes          | Yes (SendGrid)          | Yes      |
| Pre-commit Hook              | Local commit | No           | No                      | Yes      |

---

**Audit Status**: Workflows inventory complete. No workflows modified.

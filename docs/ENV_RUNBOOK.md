# Environment Management Runbook

**Purpose**: Document required environment variables and `.env.example` alignment policy.

**Last Updated**: 2025-12-31

---

## Required Environment Variables

### Core Application

| Variable       | Required | Purpose                         | Example                          |
| -------------- | -------- | ------------------------------- | -------------------------------- |
| `DATABASE_URL` | Yes      | Neon Postgres connection string | `postgresql://user:pass@host/db` |

### eBay Integration

| Variable                     | Required | Purpose                                 | Example                    |
| ---------------------------- | -------- | --------------------------------------- | -------------------------- |
| `EBAY_APP_ID`                | Yes      | eBay Browse API app identifier          | `YourAppI-YourApp-PRD-...` |
| `EBAY_CLIENT_SECRET`         | Yes      | eBay Browse API client secret           | Secret-managed             |
| `EBAY_AFFILIATE_CAMPAIGN_ID` | No       | eBay Partner Network campaign ID        | `5338...`                  |
| `EBAY_AFFILIATE_CUSTOM_ID`   | No       | eBay Partner Network custom tracking ID | `...`                      |

### External APIs

| Variable                     | Required | Purpose                                      | Example        |
| ---------------------------- | -------- | -------------------------------------------- | -------------- |
| `POKEMONTCG_IO_API_KEY`      | No\*     | PokémonTCG.io API key for catalog import     | `abc123...`    |
| `OPEN_EXCHANGE_RATES_APP_ID` | No\*\*   | Open Exchange Rates API key for automated FX | Secret-managed |

\*Required only when running `npm run import:tcg-catalog` script.

\*\*Required for automated FX rate updates in data pipelines. Get yours at https://openexchangerates.org.

### Admin Access

| Variable            | Required | Purpose                                        | Example             |
| ------------------- | -------- | ---------------------------------------------- | ------------------- |
| `ADMIN_SECRET`      | Yes      | Admin panel unlock secret (`/api/admin/login`) | Random secure token |
| `DEBUG_ADMIN_TOKEN` | Yes      | Debug panel unlock token (`/debug/*`)          | Random secure token |

### Observability

| Variable     | Required | Purpose                                      | Example                     |
| ------------ | -------- | -------------------------------------------- | --------------------------- |
| `SENTRY_DSN` | No       | Sentry error tracking DSN (server-side only) | `https://...@sentry.io/...` |

### Feature Flags — Tier 2 MVP

| Variable               | Required | Default | Purpose                                            |
| ---------------------- | -------- | ------- | -------------------------------------------------- |
| `WATCHLIST_DB_ENABLED` | No       | `false` | Enable DB-backed watchlist (replaces localStorage) |
| `ALERTS_ENABLED`       | No       | `false` | Enable email alerts system                         |

**Usage**: Set to `"true"` to enable. Any other value (including unset) = disabled.

**Note**: These flags control Tier 2 features (Alerts + DB-backed Watchlist MVP). Both default to OFF for zero behavior change until explicitly enabled.

### Email Alerts

| Variable            | Required | Purpose                                       | Example                     |
| ------------------- | -------- | --------------------------------------------- | --------------------------- |
| `SENDGRID_API_KEY`  | No\*     | SendGrid API key for alert emails             | `SG.xxxxx...`               |
| `ALERTS_EMAIL_FROM` | No\*     | Verified sender address for alert emails      | `alerts@yourdomain.com`     |
| `SITE_BASE_URL`     | No\*     | Base URL for email links (unsubscribe, cards) | `https://tcgdealfinder.com` |

\*Required only when email alerts are enabled. The `check-alerts` script gracefully skips email sending when `SENDGRID_API_KEY` is not set.

**Email Alert Architecture**:

- Users subscribe via card detail pages → stored in `email_subscriptions` table
- `check-alerts` script runs on schedule → checks thresholds → sends emails via SendGrid
- Per-subscription cooldown (6 hours) prevents spam loops
- RFC 8058 `List-Unsubscribe` headers for one-click unsubscribe in email clients
- Unsubscribe endpoint: `GET /api/alerts/unsubscribe?token={uuid}`

**Required SendGrid Setup**:

1. Create SendGrid account at https://sendgrid.com
2. Create API key with "Mail Send" permission
3. Verify sender address or authenticate sending domain
4. Set `SENDGRID_API_KEY` and `ALERTS_EMAIL_FROM` in environment

---

## Operator Enablement — Email Alerts (2 minutes)

This section documents the one-time setup for enabling the email alerts subsystem.

### Prerequisites

1. GitHub repository secrets already configured:
   - `DATABASE_URL` (required)
   - `EBAY_APP_ID` (required)
   - `EBAY_CLIENT_SECRET` (required)

### Step 1: Set Email Alert Secrets

In GitHub repo settings → Secrets and variables → Actions, add:

| Secret Name         | Required | Description                                                  |
| ------------------- | -------- | ------------------------------------------------------------ |
| `SENDGRID_API_KEY`  | Yes      | SendGrid API key with "Mail Send" permission                 |
| `ALERTS_EMAIL_FROM` | Yes      | Verified sender address (e.g., `alerts@yourdomain.com`)      |
| `SITE_BASE_URL`     | Yes      | Base URL for email links (e.g., `https://tcgdealfinder.com`) |

### Step 2: Apply Database Migration

1. Go to **Actions → Ops Enablement - Alerts MVP → Run workflow**
2. Set inputs:
   - `confirm`: `APPLY_MIGRATION_005`
   - `mode`: `migrate`
3. Click **Run workflow**
4. Wait for job to complete (green checkmark)

### Step 3: Run E2E Email Test

This step sends a REAL test email to verify the complete alerts pipeline.

1. Go to **Actions → Ops Enablement - Alerts MVP → Run workflow**
2. Set inputs:
   - `confirm`: `SEND_REAL_TEST_EMAIL`
   - `mode`: `e2e_test_email`
   - `test_email`: Your email address (required)
3. Click **Run workflow**
4. Wait for job to complete (green checkmark)
5. **Check your inbox** for the test alert email
6. **Verify unsubscribe link** works (click it to test)

**What the E2E test does:**

- Finds a card with active deals in the database
- Creates temporary test data (watch + subscription)
- Runs the full `check-alerts` flow
- Sends a real email to your test address
- Cleans up all test data automatically

**If no email received:**

- Check spam/junk folder
- Verify `ALERTS_EMAIL_FROM` is a verified sender in SendGrid
- Check SendGrid Activity for delivery status

### Step 4: Enable Scheduled Alerts (Optional)

After E2E test passes (you received the email), to enable scheduled alert checks:

1. Edit `.github/workflows/data-pipelines.yml`
2. In the `check-alerts` job `if:` condition, add the schedule trigger:
   ```yaml
   if: >-
     github.event.schedule == '*/15 * * * *' ||
     (github.event_name == 'workflow_dispatch' &&
      (github.event.inputs.job == 'check-alerts' || github.event.inputs.job == 'all'))
   ```
3. Commit and merge the change

**Note**: Keep scheduled alerts disabled until email infrastructure is fully tested to prevent noisy failures.

---

## `.env.example` Alignment Policy

**Rule**: Every environment variable consumed by the application MUST be documented in `.env.example`.

### `.env.example` Format

```bash
# Variable name with empty value
VARIABLE_NAME=

# Comment explaining purpose (optional but recommended)
# Additional usage notes or link to get credentials
```

### Verification Process

When adding a new environment variable:

1. Add the variable to your local `.env.local`
2. Add the variable to `.env.example` with empty value and comment
3. Update this runbook's "Required Environment Variables" table
4. Verify `.env.example` contains no actual secrets (only empty values or placeholders)

### Periodic Audit

Every quarter (or before major releases):

1. Compare `.env.example` against actual code usage:

   ```bash
   # Search for process.env usage
   grep -r "process\.env\." app/ lib/ scripts/ --include="*.ts" --include="*.tsx" --include="*.js"
   ```

2. Ensure every `process.env.X` has corresponding `.env.example` entry

3. Remove obsolete variables from `.env.example` if code no longer references them

---

## Local Development Setup

### First-Time Setup

1. Clone repository:

   ```bash
   git clone https://github.com/JawnShoe/tcgdealfinder.git
   cd tcg-deal-finder
   ```

2. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in required values in `.env.local`:
   - Get `DATABASE_URL` from Neon dashboard
   - Get `EBAY_APP_ID` from eBay Developer account
   - Generate secure random tokens for `ADMIN_SECRET` and `DEBUG_ADMIN_TOKEN`

4. Install dependencies and verify:
   ```bash
   npm ci
   npm run build
   ```

### Getting Credentials

- **DATABASE_URL**: Neon project dashboard → Connection Details
- **EBAY_APP_ID**: eBay Developers → My Account → Application Keys
- **POKEMONTCG_IO_API_KEY**: https://pokemontcg.io → Sign up for free API key
- **ADMIN_SECRET / DEBUG_ADMIN_TOKEN**: Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## Production Environment

### Environment Variable Management

- Production secrets are managed outside the repository (never committed)
- Use hosting platform's environment variable UI (Vercel, Netlify, etc.)
- Rotate secrets quarterly or after any suspected exposure

### Secret Rotation Procedure

1. Generate new secret value
2. Update hosting platform environment variables
3. Deploy application (triggers restart with new values)
4. Update local `.env.local` for development parity
5. Test admin/debug access with new secrets

---

## Troubleshooting

### Build fails with "DATABASE_URL is required"

**Cause**: Legacy code attempted DB connection at build time
**Fix**: Fixed in commit 7b2718f (lazy DB pool initialization)
**Verification**: `npm run build` should succeed without `DATABASE_URL`

### Runtime errors about missing environment variables

1. Check `.env.local` exists in project root
2. Verify variable names match exactly (case-sensitive)
3. Restart dev server after changing `.env.local`
4. Check for typos in variable names

### Admin/debug pages return 404

**Cause**: `ADMIN_SECRET` or `DEBUG_ADMIN_TOKEN` missing or incorrect
**Fix**: Verify secrets are set in `.env.local` and match unlock credentials

---

## Scheduled Job Failure Alerting

GitHub can notify you via UI and email when scheduled workflow runs fail, **depending on your notification settings**. This section documents how to ensure you receive these notifications.

### Notification Path (GitHub-native)

When a scheduled workflow fails, GitHub can send notifications to:

1. **Repository owner** — if email notifications are enabled in GitHub settings
2. **Users watching the repository** — if "Workflows" watch subscription is enabled

**Important**: Notifications are not guaranteed by default. You must configure your watch settings and ensure email notifications are enabled.

### Scheduled Workflows Covered

| Workflow File        | Job Name                   | Schedule        | Description                  |
| -------------------- | -------------------------- | --------------- | ---------------------------- |
| `data-pipelines.yml` | `update-listings`          | Every 30 min    | Refresh eBay listings        |
| `data-pipelines.yml` | `update-historical-prices` | Daily 3 AM UTC  | Update historical price data |
| `data-pipelines.yml` | `update-sold-listings`     | Daily 4 AM UTC  | Update sold listings data    |
| `data-pipelines.yml` | `check-alerts`             | (Manual only)\* | Check and send price alerts  |

\*`check-alerts` schedule is disabled until SENDGRID_API_KEY is configured.

### Enable Workflow Failure Notifications (Required One-Time Setup)

1. Go to https://github.com/JawnShoe/tcgdealfinder (or your fork)
2. Click **Watch** (top right) → **Custom**
3. Check **Workflows** checkbox
4. Click **Apply**

**Alternative**: Select "All Activity" to receive all repository notifications.

### Verification

To verify notifications are working:

1. Check GitHub notification settings: https://github.com/settings/notifications
2. Ensure "Email" is enabled under "Watching"
3. Ensure "Actions" notifications are not disabled in your notification routing

### Fallback: Manual Monitoring

If email notifications are unreliable, monitor scheduled job health via:

- GitHub Actions tab: https://github.com/JawnShoe/tcgdealfinder/actions
- Filter by workflow: "Data Pipelines"
- Check for red (failed) runs

### Why Sentry Can't Alert on Workflow Failures

The existing Sentry integration captures **application runtime errors** (errors in Next.js server/edge runtime). GitHub Actions workflow failures occur in isolated CI environments before the application runs, so Sentry cannot observe them. GitHub-native notifications are the appropriate mechanism for workflow failure alerting.

---

## Neon Database Access Rules

1. **Operators must not run SQL in Neon** unless the coder names the exact Neon Project + Branch + Database from `DATABASE_URL`.
2. **Never apply migrations to CI branches** unless explicitly told to; default target is the branch used by `DATABASE_URL` (usually Production/main).
3. **After running SQL**, always run `SELECT to_regclass(...)` verification and paste outputs back to the coder.

---

## Security Notes

- **Never commit `.env.local`** - it's in `.gitignore` by design
- **Never commit actual secrets to `.env.example`** - only empty values or placeholders
- **Rotate admin secrets quarterly** or after suspected exposure
- **Use strong random tokens** (32+ bytes) for `ADMIN_SECRET` and `DEBUG_ADMIN_TOKEN`

---

**Governance**: This runbook is maintained as part of the Repo Hardening Pack (2025-12-24).

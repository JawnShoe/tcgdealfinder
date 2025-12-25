# Environment Management Runbook

**Purpose**: Document required environment variables and `.env.example` alignment policy.

**Last Updated**: 2025-12-25

---

## Required Environment Variables

### Core Application

| Variable       | Required | Purpose                         | Example                          |
| -------------- | -------- | ------------------------------- | -------------------------------- |
| `DATABASE_URL` | Yes      | Neon Postgres connection string | `postgresql://user:pass@host/db` |

### eBay Integration

| Variable                   | Required | Purpose                                 | Example                    |
| -------------------------- | -------- | --------------------------------------- | -------------------------- |
| `EBAY_APP_ID`              | Yes      | eBay Browse API app identifier          | `YourAppI-YourApp-PRD-...` |
| `EBAY_PARTNER_CAMPAIGN_ID` | No       | eBay Partner Network campaign ID        | `5338...`                  |
| `EBAY_PARTNER_CUSTOM_ID`   | No       | eBay Partner Network custom tracking ID | `...`                      |

### External APIs

| Variable                | Required | Purpose                                  | Example     |
| ----------------------- | -------- | ---------------------------------------- | ----------- |
| `POKEMONTCG_IO_API_KEY` | No\*     | PokémonTCG.io API key for catalog import | `abc123...` |

\*Required only when running `npm run import:tcg-catalog` script.

### Admin Access

| Variable            | Required | Purpose                                        | Example             |
| ------------------- | -------- | ---------------------------------------------- | ------------------- |
| `ADMIN_SECRET`      | Yes      | Admin panel unlock secret (`/api/admin/login`) | Random secure token |
| `DEBUG_ADMIN_TOKEN` | Yes      | Debug panel unlock token (`/debug/*`)          | Random secure token |

### Observability

| Variable     | Required | Purpose                                      | Example                     |
| ------------ | -------- | -------------------------------------------- | --------------------------- |
| `SENTRY_DSN` | No       | Sentry error tracking DSN (server-side only) | `https://...@sentry.io/...` |

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

### Step 3: Run Smoke Test

1. Go to **Actions → Ops Enablement - Alerts MVP → Run workflow**
2. Set inputs:
   - `confirm`: (any value, not checked for smoke_test)
   - `mode`: `smoke_test`
   - `test_email`: (optional) Comma-separated email allowlist for test emails
3. Click **Run workflow**
4. Verify job completes successfully

### Step 4: Enable Scheduled Alerts (Optional)

After smoke test passes, to enable scheduled alert checks:

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

## Security Notes

- **Never commit `.env.local`** - it's in `.gitignore` by design
- **Never commit actual secrets to `.env.example`** - only empty values or placeholders
- **Rotate admin secrets quarterly** or after suspected exposure
- **Use strong random tokens** (32+ bytes) for `ADMIN_SECRET` and `DEBUG_ADMIN_TOKEN`

---

**Governance**: This runbook is maintained as part of the Repo Hardening Pack (2025-12-24).

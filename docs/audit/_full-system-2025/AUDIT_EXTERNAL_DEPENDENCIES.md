# Audit Artifact (Temporary)

**Phase**: 1 — Inventory
**Created**: 2025-12-26
**Collapses into**: PROJECT_SSOT.md
**Delete/Archive after**: Full Audit Closeout

---

# External Systems Inventory

---

## 1. Databases

### PostgreSQL (Neon)

| Attribute                | Value                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| **Name**                 | Neon PostgreSQL                                                             |
| **Purpose**              | Primary data store for listings, cards, sellers, subscriptions, rate limits |
| **Connection**           | Via `pg` package (8.11.5)                                                   |
| **Environment Variable** | `DATABASE_URL`                                                              |
| **Credentials Implied**  | Yes (connection string)                                                     |
| **Referenced In**        | `lib/db.ts`, `lib/schema.ts`, migrations/, most scripts                     |

**Notes**:

- Lazy pool initialization in `lib/db.ts`
- 7 migration files present
- Neon branding referenced in docs (ENV_RUNBOOK.md, BACKUP_POLICY.md)

---

## 2. External APIs

### eBay Buy/Browse API

| Attribute                 | Value                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Name**                  | eBay Buy/Browse API (v1)                                                                                |
| **Purpose**               | Fetch live eBay listings, item details, sold items                                                      |
| **Auth Method**           | OAuth2 client_credentials                                                                               |
| **Environment Variables** | `EBAY_APP_ID`, `EBAY_CLIENT_ID` (same as APP_ID), `EBAY_CLIENT_SECRET`                                  |
| **Credentials Implied**   | Yes (API keys)                                                                                          |
| **Referenced In**         | `lib/ebay.ts`, `lib/ebayStorefront.ts`, `scripts/update-listings.ts`, `scripts/update-sold-listings.ts` |

**Notes**:

- Supports multiple markets: US, CA, GB, AU
- Rate limit retry logic in `lib/rateLimitRetry.ts`
- Affiliate parameters: `EBAY_PARTNER_CAMPAIGN_ID`, `EBAY_PARTNER_CUSTOM_ID`

### PokémonTCG.io API

| Attribute                | Value                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| **Name**                 | PokémonTCG.io API                                                        |
| **Purpose**              | Card catalog import (sets, cards metadata)                               |
| **Environment Variable** | `POKEMONTCG_IO_API_KEY`                                                  |
| **Credentials Implied**  | Yes (API key)                                                            |
| **Referenced In**        | `scripts/import-pokemontcg-catalog.ts`, `scripts/ingest_pokemon_sets.ts` |

**Notes**:

- Optional for runtime; required only for catalog import scripts
- Source URL: https://pokemontcg.io

### TCGplayer (Reference Only)

| Attribute                | Value                                                           |
| ------------------------ | --------------------------------------------------------------- |
| **Name**                 | TCGplayer                                                       |
| **Purpose**              | Price reference links, catalog import                           |
| **Environment Variable** | None observed                                                   |
| **Credentials Implied**  | No                                                              |
| **Referenced In**        | `lib/tcgplayerClient.ts`, `scripts/import-tcgplayer-catalog.ts` |

**Notes**:

- Appears to be for reference pricing/links, not API integration
- URL patterns in `lib/affiliateUrl.ts`

---

## 3. Email Services

### SendGrid

| Attribute                 | Value                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Name**                  | SendGrid                                                                     |
| **Purpose**               | Email alerts for price drop notifications                                    |
| **API Endpoint**          | `https://api.sendgrid.com/v3/mail/send`                                      |
| **Environment Variables** | `SENDGRID_API_KEY`, `ALERTS_EMAIL_FROM`, `SITE_BASE_URL`                     |
| **Credentials Implied**   | Yes (API key, verified sender)                                               |
| **Referenced In**         | `lib/emailQueue.ts`, `scripts/check-alerts.ts`, `scripts/e2e-test-alerts.ts` |

**Notes**:

- RFC 8058 compliant unsubscribe headers implemented
- Graceful degradation if SENDGRID_API_KEY not set
- Currently disabled in scheduled pipelines (manual dispatch only)

---

## 4. Observability

### Sentry

| Attribute                | Value                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Name**                 | Sentry                                                                                                                      |
| **Purpose**              | Server-side error tracking and observability                                                                                |
| **Package**              | `@sentry/nextjs` (10.32.1)                                                                                                  |
| **Environment Variable** | `SENTRY_DSN`                                                                                                                |
| **Credentials Implied**  | Yes (DSN)                                                                                                                   |
| **Referenced In**        | `instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `sentry.client.config.ts`, `app/global-error.tsx` |

**Notes**:

- Server-only Plan A (client-side disabled)
- PII scrubbing implemented (emails, tokens, headers)
- Graceful degradation if SENTRY_DSN not set

---

## 5. Hosting / Platforms

### GitHub

| Attribute               | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **Name**                | GitHub                                                             |
| **Purpose**             | Source control, CI/CD, issue tracking                              |
| **Repository**          | `https://github.com/JawnShoe/tcgdealfinder.git`                    |
| **Credentials Implied** | Yes (via GITHUB_TOKEN in workflows)                                |
| **Referenced In**       | `.github/workflows/*`, `docs/BACKUP_POLICY.md`, `docs/RELEASES.md` |

**Notes**:

- Branch protection on `main`
- 4 GitHub Actions workflows
- Dependabot configured for npm and github-actions

### Vercel (Implied)

| Attribute                | Value                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| **Name**                 | Vercel                                                                    |
| **Purpose**              | Deployment platform (implied by Next.js patterns)                         |
| **Environment Variable** | `SITE_BASE_URL` (for production domain)                                   |
| **Credentials Implied**  | Unknown                                                                   |
| **Referenced In**        | No direct references in code; implied by Next.js and edge runtime configs |

**Notes**:

- Not explicitly confirmed in code
- Next.js 14 + edge runtime suggests Vercel-compatible deployment

---

## 6. CI/CD

### GitHub Actions

| Attribute            | Value                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Name**             | GitHub Actions                                                                                                |
| **Purpose**          | Continuous integration, data pipelines, operations                                                            |
| **Workflows**        | 4 workflow files                                                                                              |
| **Secrets Required** | `DATABASE_URL`, `EBAY_APP_ID`, `EBAY_CLIENT_SECRET`, `SENDGRID_API_KEY`, `ALERTS_EMAIL_FROM`, `SITE_BASE_URL` |
| **Referenced In**    | `.github/workflows/ci.yml`, `data-pipelines.yml`, `dependabot-auto-merge.yml`, `ops-enable-alerts.yml`        |

**Notes**:

- CI runs lint, test:unit, build (no secrets required)
- Data pipelines require DATABASE_URL + eBay secrets
- Ops workflows require additional email secrets

---

## Summary: Secrets/Credentials Required

| Secret                  | Required For              | Set In                     |
| ----------------------- | ------------------------- | -------------------------- |
| `DATABASE_URL`          | All DB operations         | .env.local, GitHub Secrets |
| `EBAY_APP_ID`           | Listing updates           | .env.local, GitHub Secrets |
| `EBAY_CLIENT_SECRET`    | eBay OAuth2               | GitHub Secrets only        |
| `POKEMONTCG_IO_API_KEY` | Catalog import (optional) | .env.local                 |
| `ADMIN_SECRET`          | Admin panel auth          | .env.local                 |
| `DEBUG_ADMIN_TOKEN`     | Debug page auth           | .env.local                 |
| `SENTRY_DSN`            | Error tracking (optional) | .env.local                 |
| `SENDGRID_API_KEY`      | Email alerts              | GitHub Secrets             |
| `ALERTS_EMAIL_FROM`     | Email sender address      | GitHub Secrets             |
| `SITE_BASE_URL`         | Email links               | GitHub Secrets             |

---

**Audit Status**: External dependencies inventory complete. No secrets recorded. No code changes made.

# Expert Audit Report - TCG Deal Finder

Status: Advisory  
Canonical decisions live in: `PROJECT_SSOT.md` + `docs/WORKSTREAMS_MASTER.md`  
Scope: External expert audit findings (non-executable; actions tracked as workstreams)  
Last reviewed: 2025-12-29  
Notes: Do not implement “recommendations” unless they are accepted into SSOT/workstreams.

**Date**: 2025-12-25
**Auditor**: Claude Code Expert Audit
**Scope**: Full-stack review (backend, frontend, infrastructure, tooling)
**Governing Docs**: [PROJECT_SSOT.md](../../PROJECT_SSOT.md), [SHIFT_LOCK.md](../../SHIFT_LOCK.md)

---

## Executive Summary

Overall the codebase demonstrates **strong operational maturity** with well-documented SSOT discipline, locked systems, and comprehensive runbooks. The main concerns are **N+1 query patterns** in critical paths, **missing database indexes** for common query patterns, and **scheduled job visibility gaps**. Security posture is solid with proper auth gates and secret hygiene.

**Score: 7.5/10** (unchanged from prior audit — foundational issues remain but ops maturity is high)

---

## Top 10 Issues (Ranked by Risk/ROI)

### 1. N+1 Query Pattern in Critical Paths (HIGH RISK)

**Location**: [app/api/deals/dealsQuery.ts:150-175](../../app/api/deals/dealsQuery.ts#L150-L175), [app/cards/[cardId]/page.tsx:539-553](../../app/cards/[cardId]/page.tsx#L539-L553)

**Issue**: `shouldExcludeListingFromCardSurfaces()` is called per-listing in a loop after fetching deals. Each call queries `listing_overrides` via `getOverridesCache()` which hits the DB (with 60s cache). For a 50-listing page, if cache is cold, this creates sequential DB roundtrips.

**Impact**: Latency spikes on first request after cache expiry; P95 response times could exceed 2s under load.

**Recommendation**:

- Pre-fetch all overrides for the batch of listing IDs in a single query
- Pass the pre-fetched map into `shouldExcludeListingFromCardSurfaces()`

**Effort**: Medium (1-2 days)
**Verification**: Measure query count before/after with `pg_stat_statements`

---

### 2. Missing Index on `listings.card_id` (HIGH RISK)

**Location**: [scripts/init-db.ts:30-74](../../scripts/init-db.ts#L30-L74)

**Issue**: Queries like `WHERE l.card_id = ANY($1)` ([app/cards/[cardId]/page.tsx:298](../../app/cards/[cardId]/page.tsx#L298)) rely on `card_id` filtering but no dedicated index exists. Current indexes:

- `listings_market_idx` on `(market)`
- `listings_market_card_id_idx` on `(market, card_id)`

The composite index only helps if `market` is also filtered; card-only lookups do full scans.

**Impact**: Card detail pages may slow as listing count grows; currently masked by small dataset.

**Recommendation**: Add `CREATE INDEX listings_card_id_idx ON listings(card_id);`

**Effort**: Quick win (~30 minutes)
**Verification**: `EXPLAIN ANALYZE` on card detail query before/after

---

### 3. Scheduled Job Failure Alerting Gap (MEDIUM-HIGH RISK)

**Location**: [.github/workflows/data-pipelines.yml](../../.github/workflows/data-pipelines.yml)

**Issue**: Data pipeline jobs (`update-listings`, `update-historical-prices`, `update-sold-listings`) run on schedule but failures go unnoticed until manually checked. No Slack/email notification on job failure.

**Impact**: Stale data for hours/days without operator awareness; users lose trust seeing old listings.

**Recommendation**:

- Add GitHub Actions failure notification (Slack webhook or email via `workflow_call`)
- Consider adding a "data freshness" alert that fires if `listings.updated_at` median age > 2 hours

**Effort**: Medium (1 day)
**Verification**: Force a failure and confirm notification fires

---

### 4. `force-dynamic` Applied Broadly (MEDIUM RISK)

**Location**: [app/top-deals/page.tsx:1](../../app/top-deals/page.tsx#L1), [app/ending-soon/page.tsx:1](../../app/ending-soon/page.tsx#L1), [app/sets/page.tsx:1](../../app/sets/page.tsx#L1), [app/catalog/page.tsx:1](../../app/catalog/page.tsx#L1), [app/alerts/page.tsx:1](../../app/alerts/page.tsx#L1)

**Issue**: These pages use `export const dynamic = 'force-dynamic'` which bypasses Next.js static generation. While necessary for DB-backed pages, it means no edge caching — every request hits origin.

**Impact**: Higher origin load; TTFB depends entirely on DB query speed.

**Recommendation**:

- `/sets` and `/catalog` could potentially be ISR (Incremental Static Regeneration) with `revalidate: 3600` since set data changes infrequently
- Consider Vercel Edge Functions or a CDN cache layer for `/top-deals` with short TTL (30s)

**Effort**: Medium (1-2 days)
**Verification**: Measure TTFB and cache hit rates post-change

---

### 5. SQL Injection Risk in Dynamic ORDER BY (LOW-MEDIUM RISK)

**Location**: [app/api/deals/dealsQuery.ts:401-402](../../app/api/deals/dealsQuery.ts#L401-L402)

**Issue**: Market code is interpolated directly into SQL:

```typescript
const marketClause =
  hasListingsMarketColumn && market !== "all"
    ? `AND l.market = '${market}'`
    : "";
```

Although `market` is validated through `normalizeMarketCode()`, this pattern is fragile.

**Impact**: If validation is bypassed or future code paths skip normalization, SQL injection is possible.

**Recommendation**: Use parameterized queries consistently:

```typescript
const marketClause =
  hasListingsMarketColumn && market !== "all"
    ? `AND l.market = $N` // with market in params array
    : "";
```

**Effort**: Quick win (~2 hours)
**Verification**: Code review + integration test with malicious input

---

### 6. Email Subscription Lacks Rate Limiting (MEDIUM RISK)

**Location**: [app/api/alerts/subscribe/route.ts](../../app/api/alerts/subscribe/route.ts)

**Issue**: The subscribe endpoint has no rate limiting. An attacker could:

- Flood the `email_subscriptions` table with fake entries
- Trigger email spam if `check-alerts` is enabled

**Impact**: DB bloat, potential email reputation damage, SendGrid costs.

**Recommendation**:

- Add IP-based rate limiting (e.g., Vercel's built-in rate limits or upstash/ratelimit)
- Consider email verification before activating subscription

**Effort**: Medium (1 day)
**Verification**: Attempt rapid requests and confirm blocking

---

### 7. Sentry Edge Runtime Missing `beforeSend` Scrubbing (LOW RISK)

**Location**: [instrumentation.ts:40-50](../../instrumentation.ts#L40-L50)

**Issue**: Server runtime has `beforeSend` scrubbing for emails/tokens, but edge runtime does not:

```typescript
if (process.env.NEXT_RUNTIME === "edge") {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // No beforeSend scrubbing
  });
}
```

**Impact**: Potential PII leakage in edge-executed errors.

**Recommendation**: Add identical `beforeSend` handler to edge runtime init.

**Effort**: Quick win (~30 minutes)
**Verification**: Trigger an edge error with email in message, confirm scrubbed in Sentry

---

### 8. Test Coverage Gap for Critical Paths (MEDIUM RISK)

**Location**: [lib/**tests**/unit/](../../lib/__tests__/unit/), [scripts/**tests**/unit/](../../scripts/__tests__/unit/)

**Issue**: Unit tests exist (24 passing) but no coverage of:

- `dealsQuery.ts` (complex SQL building logic)
- `shouldExcludeListingFromCardSurfaces()` integration
- Admin auth gates
- Email subscription/unsubscribe flows

**Impact**: Regressions in critical paths may go unnoticed until production.

**Recommendation**: Add targeted tests for:

- SQL building with edge cases (empty results, all filters, no market)
- Blacklist override precedence
- Admin cookie authentication

**Effort**: Medium (2-3 days)
**Verification**: Coverage report showing critical paths > 70%

---

### 9. Admin Cookie Value is Static "1" (LOW RISK)

**Location**: [lib/adminAuth.ts:8-9](../../lib/adminAuth.ts#L8-L9)

**Issue**: Admin authentication checks `cookieValue === "1"` which is predictable. Anyone who guesses to set `admin_auth=1` cookie could gain admin access.

**Impact**: Low in practice (requires cookie access), but defense-in-depth recommends unpredictable tokens.

**Recommendation**: Use a signed/encrypted cookie value or validate against a server-side session.

**Effort**: Medium (1 day)
**Verification**: Attempt access with forged cookie, confirm rejection

---

### 10. No Health Check for Scheduled Jobs (MEDIUM RISK)

**Location**: [app/api/health/route.ts](../../app/api/health/route.ts)

**Issue**: Health endpoint checks data freshness but doesn't expose scheduled job status. Operators can't easily see if `check-alerts` or `update-listings` last succeeded.

**Impact**: Silent failures in background jobs go undetected.

**Recommendation**: Add job status tracking (last run time, last result) to health endpoint or a dedicated `/api/health/jobs` endpoint.

**Effort**: Medium (1 day)
**Verification**: Confirm job status appears in health check

---

## Quick Wins (<=2 hours each)

| #   | Issue                                                       | File                                         | Effort | Impact      |
| --- | ----------------------------------------------------------- | -------------------------------------------- | ------ | ----------- |
| 1   | Add `listings_card_id_idx` index                            | init-db.ts + migration                       | 30 min | Query perf  |
| 2   | Parameterize market clause in SQL                           | dealsQuery.ts:401                            | 1 hr   | Security    |
| 3   | Add `beforeSend` to edge Sentry                             | instrumentation.ts:45                        | 30 min | PII safety  |
| 4   | Add `INTERVAL` to SQL with parameter                        | emailSubscriptions.ts:151, dealsQuery.ts:379 | 1 hr   | SQL hygiene |
| 5   | Add missing `last_emailed_at` index migration to init-db.ts | init-db.ts                                   | 30 min | Consistency |

---

## Medium Lifts (1-2 days each)

| #   | Issue                                  | Effort   | Impact                  |
| --- | -------------------------------------- | -------- | ----------------------- |
| 1   | Batch override lookup to eliminate N+1 | 1-2 days | Major latency reduction |
| 2   | Job failure alerting (Slack/email)     | 1 day    | Ops visibility          |
| 3   | Rate limiting on subscribe endpoint    | 1 day    | Security hardening      |
| 4   | Unit tests for dealsQuery + auth       | 2-3 days | Regression prevention   |
| 5   | ISR for `/sets` and `/catalog`         | 1 day    | TTFB improvement        |

---

## No-Go Refactors (Not Worth It Now)

| #   | Suggestion                               | Reason to Defer                                          |
| --- | ---------------------------------------- | -------------------------------------------------------- |
| 1   | Migrate to Prisma/Drizzle ORM            | Working raw SQL; migration risk > benefit                |
| 2   | Redesign listing_overrides as join table | Current system works; blast radius too high              |
| 3   | Move to edge-first architecture          | DB-backed pages don't benefit from edge; adds complexity |
| 4   | Add GraphQL layer                        | REST API is sufficient; GraphQL adds maintenance burden  |
| 5   | Rewrite blacklist as ML classifier       | Current keyword system is transparent and auditable      |

---

## Risk Register

### Security / Secret Exposure Risks

| Risk                             | Likelihood | Severity | Mitigation Status                                                      |
| -------------------------------- | ---------- | -------- | ---------------------------------------------------------------------- |
| ADMIN_SECRET in logs             | Low        | High     | Mitigated (no URL secrets, HttpOnly cookies)                           |
| SQL injection                    | Low        | Critical | Partially mitigated (normalization exists, recommend parameterization) |
| Cookie forgery                   | Low        | Medium   | Partially mitigated (recommend signed tokens)                          |
| API key exposure in error traces | Low        | Medium   | Mitigated (Sentry beforeSend scrubs tokens)                            |

### Data Integrity Risks

| Risk                              | Likelihood | Severity | Mitigation Status                                   |
| --------------------------------- | ---------- | -------- | --------------------------------------------------- |
| Stale listings shown as fresh     | Medium     | High     | Mitigated (freshness timestamp visible, 4hr cutoff) |
| FX rate drift                     | Medium     | Medium   | Noted (FX updates are manual-only by design)        |
| Duplicate listings across markets | Low        | Medium   | Mitigated (listing_id uniqueness + dedup logic)     |
| Override cache race condition     | Low        | Medium   | Acceptable (60s TTL is reasonable)                  |

### Operational Risks

| Risk                           | Likelihood | Severity | Mitigation Status                                          |
| ------------------------------ | ---------- | -------- | ---------------------------------------------------------- |
| Pipeline job failure unnoticed | Medium     | High     | **GAP** — no alerting                                      |
| eBay API rate limit hit        | Medium     | Medium   | Mitigated (semaphore in update-listings)                   |
| SendGrid reputation damage     | Low        | High     | Mitigated (cooldowns, unsubscribe links, RFC 8058 headers) |
| Neon DB connection exhaustion  | Low        | Medium   | Mitigated (lazy pool init, global singleton in dev)        |

---

## Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐ │
│  │ update-listings  │   │ update-historicals│   │ update-sold-listings    │ │
│  │ (every 30 min)   │   │ (daily 3AM UTC)  │   │ (daily 4AM UTC)         │ │
│  │                  │   │                  │   │                          │ │
│  │ eBay Browse API  │   │ eBay Sold API    │   │ eBay Sold API            │ │
│  └────────┬─────────┘   └────────┬─────────┘   └────────────┬─────────────┘ │
│           │                      │                          │               │
│           ▼                      ▼                          ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         NEON POSTGRES                                   ││
│  │  ┌──────────┐ ┌──────────────────┐ ┌───────────────┐ ┌───────────────┐  ││
│  │  │ listings │ │ historical_prices│ │ ebay_sold_... │ │ cards         │  ││
│  │  │ (active) │ │ (medians)        │ │ (raw sold)    │ │ (canonical)   │  ││
│  │  └──────────┘ └──────────────────┘ └───────────────┘ └───────────────┘  ││
│  │  ┌──────────────────┐ ┌───────────────────┐ ┌────────────────────────┐  ││
│  │  │ listing_overrides│ │ seller_blacklist  │ │ email_subscriptions    │  ││
│  │  │ (ALLOW/BLOCK)    │ │ (blocked sellers) │ │ (alert signups)        │  ││
│  │  └──────────────────┘ └───────────────────┘ └────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            QUERY LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      dealsQuery.ts (CRITICAL PATH)                      ││
│  │  • Builds dynamic SQL with market/sort/pagination filters               ││
│  │  • Joins listings → cards → historical_prices                           ││
│  │  • Applies blacklist/override filtering post-query                      ││
│  │  • Computes discount, confidence, seller seen counts                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────────┐ │
│  │ /api/deals     │  │ /api/cards/... │  │ /api/alerts/subscribe         │ │
│  │ (sort,page,mkt)│  │ (card detail)  │  │ (email signup)                 │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             UI SURFACES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PUBLIC PAGES (force-dynamic):                                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │
│  │ / (home)   │ │ /top-deals │ │ /newest    │ │/ending-soon│ │ /sets     │  │
│  │ Featured + │ │ Best deals │ │ Latest     │ │ By end time│ │ Set list  │  │
│  │ DealsTable │ │ (7 cols)   │ │ listings   │ │            │ │           │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘  │
│                                                                              │
│  DETAIL PAGES:                                                               │
│  ┌────────────────────────────┐ ┌────────────────────────────────────────┐  │
│  │ /cards/[cardId]            │ │ /sets/[setId]                          │  │
│  │ Best Trusted Deal + listings│ │ Hot cards + deals + catalog            │  │
│  └────────────────────────────┘ └────────────────────────────────────────┘  │
│                                                                              │
│  ADMIN PAGES (cookie-gated):                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ /admin (hub) → /admin/blacklist, /admin/listings, /admin/alerts        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ALERTS PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐      ┌─────────────────────┐      ┌──────────────┐ │
│  │ check-alerts.ts     │ ───► │ emailSubscriptions  │ ───► │ SendGrid API │ │
│  │ (manual/scheduled)  │      │ (cooldown + lookup) │      │ (send email) │ │
│  └─────────────────────┘      └─────────────────────┘      └──────────────┘ │
│           │                            │                                     │
│           ▼                            ▼                                     │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │ alerts_watchlist    │      │ alerts_log          │                       │
│  │ (active watches)    │      │ (fired alerts)      │                       │
│  └─────────────────────┘      └─────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure & Tooling Audit

### Neon (Database)

**Well-Designed**:

- Lazy pool initialization avoids build-time DB dependency
- Migrations are versioned SQL files with idempotent `IF NOT EXISTS`
- `UNIQUE` constraints prevent duplicate listings/cards

**Fragile/Risky**:

- No automated backup verification (Neon PITR requires paid plan)
- Schema drift risk: init-db.ts and migrations/ may diverge over time
- No connection pooler configured for production (Neon serverless handles this, but should verify)

**Missing**:

- Index on `listings.card_id` alone
- Index on `listings.seller_username` for blacklist joins
- `EXPLAIN ANALYZE` baseline for critical queries

**Recommendation**: Create a migration checklist that updates both init-db.ts AND migration files together.

---

### GitHub (CI/CD, Branch Protection, Secrets)

**Well-Designed**:

- Branch protection on main requires "Lint & Build"
- Dependabot with auto-merge for patch/minor only
- Minimal permissions (`contents: read`)
- Concurrency groups prevent parallel pipeline runs

**Fragile/Risky**:

- data-pipelines.yml has no failure notification
- `check-alerts` job is disabled (manual-only) until email secrets configured
- No secret scanning (requires GitHub Advanced Security upgrade)

**Over-Engineered**:

- Nothing found — CI is appropriately minimal

**Missing**:

- Workflow run notifications (Slack/email on failure)
- Integration test job (currently local-only)
- Release automation (manual tag push)

---

### Sentry (Observability)

**Well-Designed**:

- Server-only init (no client bundle bloat)
- `beforeSend` scrubs emails and tokens
- Optional DSN (graceful degradation when not set)

**Fragile/Risky**:

- Edge runtime lacks `beforeSend` scrubbing
- `tracesSampleRate: 0.1` may miss perf issues in low-traffic periods

**Missing**:

- Performance monitoring dashboard
- Custom error grouping for known issues
- Alert rules for error spikes

**Recommendation**: Set up Sentry Alerts for:

- Error rate > 5% in 5 minutes
- New unhandled exception patterns

---

### SendGrid (Email Alerts)

**Well-Designed**:

- RFC 8058 `List-Unsubscribe` headers
- Per-subscription cooldown (6 hours)
- Graceful skip when API key not configured

**Fragile/Risky**:

- No rate limiting on subscribe endpoint
- No email verification flow (auto-confirms on subscribe)
- `ALERTS_EMAIL_FROM` must be verified sender in SendGrid

**Missing**:

- Bounce/complaint handling
- Suppression list management
- Email delivery monitoring

**Recommendation**: Monitor SendGrid dashboard for bounces; implement bounce webhook if available.

---

### Operational Docs & Runbooks

**Well-Designed**:

- ENV_RUNBOOK.md is comprehensive with step-by-step enablement
- BACKUP_POLICY.md has testable commands
- SHIFT_LOCK.md prevents scope creep effectively

**Misleading/Stale**:

- PROJECT_SSOT.md says "39 routes compiled" but current build may differ
- docs/INDEX.md last updated reference may drift

**Recommendation**: Add a CI step that prints route count and fails if significantly different from documented value.

---

## Verification Steps for Each Recommendation

| #   | Recommendation           | Verification Command/Check                                      |
| --- | ------------------------ | --------------------------------------------------------------- |
| 1   | Add listings_card_id_idx | `EXPLAIN ANALYZE SELECT * FROM listings WHERE card_id = 123;`   |
| 2   | Parameterize market SQL  | Manual code review + test with `market="'; DROP TABLE--"`       |
| 3   | Edge Sentry beforeSend   | Trigger edge error, check Sentry for `[EMAIL]` scrubbing        |
| 4   | Batch override lookup    | Add `console.log` with query count, confirm single query        |
| 5   | Job failure alerting     | Force job failure, confirm Slack/email notification             |
| 6   | Subscribe rate limiting  | `for i in {1..100}; do curl -X POST ...; done` — confirm 429    |
| 7   | ISR for /sets            | Check `x-nextjs-cache: HIT` header after first request          |
| 8   | Test coverage            | `npm run test:coverage` (add coverage script first)             |
| 9   | Signed admin cookie      | Attempt access with `admin_auth=1` after change, confirm denied |
| 10  | Job status in health     | `curl /api/health` — confirm job status fields present          |

---

## Appendix: Files Reviewed

### Critical Path Files

- [app/api/deals/dealsQuery.ts](../../app/api/deals/dealsQuery.ts)
- [app/api/deals/route.ts](../../app/api/deals/route.ts)
- [app/cards/[cardId]/page.tsx](../../app/cards/[cardId]/page.tsx)
- [lib/blacklist.ts](../../lib/blacklist.ts)

### Infrastructure Files

- [lib/db.ts](../../lib/db.ts)
- [lib/schema.ts](../../lib/schema.ts)
- [scripts/init-db.ts](../../scripts/init-db.ts)
- [instrumentation.ts](../../instrumentation.ts)

### Auth & Security

- [lib/adminAuth.ts](../../lib/adminAuth.ts)
- [app/api/admin/login/route.ts](../../app/api/admin/login/route.ts)

### Email & Alerts

- [scripts/check-alerts.ts](../../scripts/check-alerts.ts)
- [lib/emailQueue.ts](../../lib/emailQueue.ts)
- [lib/emailSubscriptions.ts](../../lib/emailSubscriptions.ts)
- [app/api/alerts/subscribe/route.ts](../../app/api/alerts/subscribe/route.ts)

### CI/CD & Workflows

- [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- [.github/workflows/data-pipelines.yml](../../.github/workflows/data-pipelines.yml)
- [.github/workflows/dependabot-auto-merge.yml](../../.github/workflows/dependabot-auto-merge.yml)
- [.github/workflows/ops-enable-alerts.yml](../../.github/workflows/ops-enable-alerts.yml)

### Documentation

- [PROJECT_SSOT.md](../../PROJECT_SSOT.md)
- [SHIFT_LOCK.md](../../SHIFT_LOCK.md)
- [docs/ENV_RUNBOOK.md](../ENV_RUNBOOK.md)
- [docs/BACKUP_POLICY.md](../BACKUP_POLICY.md)
- [docs/DB_MIGRATIONS_RUNBOOK.md](../DB_MIGRATIONS_RUNBOOK.md)

---

**End of Audit Report**

_No code changes were made during this audit phase per project requirements._

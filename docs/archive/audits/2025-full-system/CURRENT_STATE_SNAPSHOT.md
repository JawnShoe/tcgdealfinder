> **Archived after Full System Audit closeout (2025-12-26)**

# Current State Snapshot (Archived)

```
Audit Artifact (Archived)
Phase: 4 — Clean-Slate Snapshot
Created: 2025-12-26
Archived: 2025-12-26
```

---

## 1. What Exists Today (Facts Only)

### Frontend Architecture

The application uses Next.js 14 App Router with Server Components as the default. All data-displaying pages render dynamically via `force-dynamic` or implicit dynamic behavior (using `cookies()`, `headers()`, or `searchParams`). There are 28 Client Components, primarily for interactivity (modals, forms, client-side state). No static pages exist; all content is fresh on every request. The watchlist feature uses `localStorage` for persistence with no server sync.

### Backend/API Shape

There are 21 API routes under `app/api/`. Admin routes are protected by a cookie (`admin_auth=1`) plus a header secret (`x-admin-secret`). Debug routes use SHA-256 hashed token authentication. Public routes include deals listing, card details, and alert subscriptions. The only rate-limited endpoint is `/api/alerts/subscribe` (5 requests per 5 minutes per IP). All routes use the Node.js runtime; no edge functions are deployed.

### Data/DB Model

The database is PostgreSQL hosted on Neon. Access is via the `pg` library with a single connection pool; no ORM is used. There are 17 tables organized around cards, listings, historical prices, alerts, and admin controls. Migrations are SQL files applied manually via the Neon SQL Editor; there is no migration tracking table. Schema checks run at request time via `information_schema` queries with in-memory caching.

### Ops/Pipelines/Alerts

All automation runs via GitHub Actions. Four workflows exist: CI (lint/test/build), Data Pipelines (scheduled jobs), Dependabot Auto-Merge, and Ops Enablement. Three scheduled jobs run: listings update (every 30 minutes), sold listings (daily), and historical prices (daily). The alerts system is fully implemented but email sending is gated by configuration; it requires manual operator enablement via secrets and workflow dispatch. FX rate updates require manual CLI input.

---

## 2. What Is Stable and Understood

- Data pipelines are GitHub Actions–based and idempotent (upserts with `ON CONFLICT`)
- All pages render dynamically for data freshness; no stale cache issues
- Alerts infrastructure exists but is intentionally gated off pending SendGrid configuration
- Admin authentication uses cookie + header dual verification
- Debug authentication uses SHA-256 hashed tokens (not plaintext comparison)
- Rate limiting exists on the subscription endpoint with sliding window implementation
- Seller blacklisting works at both SQL level and application display layer (defense in depth)
- Market detection flows through cookies → geo headers → fallback default
- CI runs lint, tests, and build on every push/PR to main
- Dependabot auto-merges patch/minor updates after CI passes

---

## 3. Known Risks (Not Fixes)

### Data Risks

1. **No migration tracking table** — Migrations are applied manually with no DB record of what's been run. Risk of re-running or missing migrations.
2. **No transaction wrappers** — `lib/db.ts` has no `transaction()` helper. Complex multi-statement operations could leave partial state.
3. **Sold listings deduplication** — `ebay_sold_listings` is append-only with no dedup constraint. Running the pipeline twice may insert duplicates.
4. **Stale listing persistence** — Ended auction listings appear to persist indefinitely. No visible cleanup logic.
5. **Neon backup policy opacity** — Backup configuration lives in Neon dashboard, not visible in code.

### Ops Risks

1. **FX rates require manual update** — No automated FX rate refresh exists.
2. **Rate limit table growth** — Opportunistic 1% cleanup may lag behind high-volume traffic.
3. **Alert check frequency** — When enabled, 15-minute schedule may be aggressive for low-volume subscriptions.
4. **Production migration state unknown** — No way to verify from code which migrations have been applied.

### Security Risks

1. **Static admin cookie value** — Cookie value is literally `"1"`, not a session token. If leaked, attacker has admin access for 7 days.
2. **No global rate limiting** — Only `/api/alerts/subscribe` is rate limited. Other routes could be hammered.
3. **No CSRF protection** — API routes rely on SameSite cookies alone.
4. **IP extraction reliability** — If not behind proxy, all requests group as `"unknown"` for rate limiting.

### Performance Risks

1. **Schema checks on every request** — `ensureXxxColumn()` functions query `information_schema` on cold starts.
2. **No caching layer** — All pages hit the database on every request; no Redis or in-memory cache.

---

## 4. Intentionally Deferred Items

The following items are known and accepted for now:

- **Email alerts disabled by default** — Requires operator to configure SendGrid secrets and enable schedule. This is intentional to prevent noisy failures.
- **Manual FX rate updates** — Low frequency of rate changes makes automation low priority.
- **No test coverage metrics** — Unit tests exist but coverage reporting is not configured.
- **No staging environment** — Development uses local DB; production is Neon main branch.
- **Admin cookie simplicity** — Current `admin_auth=1` approach is accepted for single-operator use case.
- **Append-only sold listings** — Historical data accumulation is acceptable; cleanup can be added later.

---

## 5. Clear Next-Workstream Options (Titles Only)

1. **Alerts MVP (ROI Feature)** — Enable email alerts end-to-end for user value
2. **Docs Cleanup (Phase 2B)** — Consolidate audit artifacts into PROJECT_SSOT.md
3. **Ops Hardening** — Session-based admin auth, global rate limiting, migration tracking
4. **Performance Optimization** — Schema check caching, query optimization, connection pooling
5. **Test Coverage Expansion** — Add integration tests, coverage reporting, CI gates

---

## 6. One-Paragraph Boss Summary

The full system audit is complete. We now understand exactly how this application works: a Next.js frontend rendering fresh data from a Neon PostgreSQL database, with GitHub Actions handling all scheduled data pipelines. The architecture is sound and the code is well-organized. There are no critical bugs blocking operation. The known risks are documented and manageable — the main items are around admin authentication simplicity and lack of migration tracking, neither of which affects normal users. The email alerts feature is fully built but intentionally disabled pending operator configuration. From here, all technical decisions are deliberate choices rather than unknowns. The codebase is ready for feature work or hardening, depending on priorities.

---

**LOCKED**: Phase 4 snapshot only; no code/config/workflow edits

**VERIFIED**: All open questions consolidated from Phases 3A-3D

**REGRESSION**: N/A (documentation only)

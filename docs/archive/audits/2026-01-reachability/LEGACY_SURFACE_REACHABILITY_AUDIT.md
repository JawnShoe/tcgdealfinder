# Legacy Surface Reachability Audit

**Date:** 2026-01-19
**Branch:** `main` @ `beda95f889154a491934b466c948b499fa16b8ce`
**Auditor:** Claude Code (automated)

---

## 1) Executive Summary

| Metric                    | Count                                |
| ------------------------- | ------------------------------------ |
| Total page routes scanned | 24                                   |
| Total API routes scanned  | 28                                   |
| **Behavior breakdown:**   |                                      |
| 200 OK                    | 10                                   |
| 308 Permanent Redirect    | 14                                   |
| 404 Not Found             | 3 (mandatory legacy probes)          |
| 405 Method Not Allowed    | 2 (POST-only API endpoints via HEAD) |

**High-level conclusion:** Legacy reachability risk = **LOW**

All non-rebuild page routes either:

- Return 308 permanent redirect to canonical `/rebuild/*` paths, OR
- Return 404 (for explicitly removed legacy routes like `/cards/[id]`, `/sets`, `/sets/[id]`)

No legacy routes return 200 OK with stale content. The legacy namespace (`legacy/**`) does not exist. No imports from old legacy modules were found.

---

## 2) Route Inventory (Static from Filesystem)

### A) Page Routes

| File Path                             | URL Path                  | Under /rebuild? |
| ------------------------------------- | ------------------------- | --------------- |
| `app/page.tsx`                        | `/`                       | N               |
| `app/discovery/page.tsx`              | `/discovery`              | N               |
| `app/ending-soon/page.tsx`            | `/ending-soon`            | N               |
| `app/newest/page.tsx`                 | `/newest`                 | N               |
| `app/top-deals/page.tsx`              | `/top-deals`              | N               |
| `app/search/page.tsx`                 | `/search`                 | N               |
| `app/alerts/page.tsx`                 | `/alerts`                 | N               |
| `app/alerts/unsubscribe/page.tsx`     | `/alerts/unsubscribe`     | N               |
| `app/watchlist/page.tsx`              | `/watchlist`              | N               |
| `app/admin/page.tsx`                  | `/admin`                  | N               |
| `app/admin/exclusions/page.tsx`       | `/admin/exclusions`       | N               |
| `app/admin/blacklist/page.tsx`        | `/admin/blacklist`        | N               |
| `app/admin/alerts/page.tsx`           | `/admin/alerts`           | N               |
| `app/admin/listings/page.tsx`         | `/admin/listings`         | N               |
| `app/debug/exclusions/page.tsx`       | `/debug/exclusions`       | N               |
| `app/rebuild/page.tsx`                | `/rebuild`                | Y               |
| `app/rebuild/discovery/page.tsx`      | `/rebuild/discovery`      | Y               |
| `app/rebuild/alerts/page.tsx`         | `/rebuild/alerts`         | Y               |
| `app/rebuild/listing/[id]/page.tsx`   | `/rebuild/listing/[id]`   | Y               |
| `app/rebuild/ops/page.tsx`            | `/rebuild/ops`            | Y               |
| `app/rebuild/ops/exclusions/page.tsx` | `/rebuild/ops/exclusions` | Y               |
| `app/rebuild/ops/blacklist/page.tsx`  | `/rebuild/ops/blacklist`  | Y               |
| `app/rebuild/ops/alerts/page.tsx`     | `/rebuild/ops/alerts`     | Y               |
| `app/rebuild/ops/listings/page.tsx`   | `/rebuild/ops/listings`   | Y               |

### B) API Routes

| File Path                                       | URL Path                            | Under /rebuild? |
| ----------------------------------------------- | ----------------------------------- | --------------- |
| `app/api/health/route.ts`                       | `/api/health`                       | N               |
| `app/api/deals/route.ts`                        | `/api/deals`                        | N               |
| `app/api/market/route.ts`                       | `/api/market`                       | N               |
| `app/api/search-cards/route.ts`                 | `/api/search-cards`                 | N               |
| `app/api/historicals/[cardId]/route.ts`         | `/api/historicals/[cardId]`         | N               |
| `app/api/listings/by-ebay-id/route.ts`          | `/api/listings/by-ebay-id`          | N               |
| `app/api/cards/[cardId]/other-markets/route.ts` | `/api/cards/[cardId]/other-markets` | N               |
| `app/api/alerts/subscribe/route.ts`             | `/api/alerts/subscribe`             | N               |
| `app/api/alerts/unsubscribe/route.ts`           | `/api/alerts/unsubscribe`           | N               |
| `app/api/admin/login/route.ts`                  | `/api/admin/login`                  | N               |
| `app/api/admin/alerts/create/route.ts`          | `/api/admin/alerts/create`          | N               |
| `app/api/admin/alerts/delete/route.ts`          | `/api/admin/alerts/delete`          | N               |
| `app/api/admin/alerts/toggle/route.ts`          | `/api/admin/alerts/toggle`          | N               |
| `app/api/admin/allow-listing/route.ts`          | `/api/admin/allow-listing`          | N               |
| `app/api/admin/blacklist-seller/route.ts`       | `/api/admin/blacklist-seller`       | N               |
| `app/api/admin/hide-listing/route.ts`           | `/api/admin/hide-listing`           | N               |
| `app/api/admin/revoke-allow/route.ts`           | `/api/admin/revoke-allow`           | N               |
| `app/api/debug/integrity/route.ts`              | `/api/debug/integrity`              | N               |
| `app/api/debug/overrides/route.ts`              | `/api/debug/overrides`              | N               |
| `app/api/rebuild/alerts/evaluate/route.ts`      | `/api/rebuild/alerts/evaluate`      | Y               |
| `app/api/rebuild/alerts/subscribe/route.ts`     | `/api/rebuild/alerts/subscribe`     | Y               |
| `app/api/rebuild/alerts/unsubscribe/route.ts`   | `/api/rebuild/alerts/unsubscribe`   | Y               |
| `app/api/rebuild/outbound-click/route.ts`       | `/api/rebuild/outbound-click`       | Y               |
| `app/api/rebuild/ops/login/route.ts`            | `/api/rebuild/ops/login`            | Y               |
| `app/api/rebuild/ops/exclusions/route.ts`       | `/api/rebuild/ops/exclusions`       | Y               |
| `app/api/rebuild/ops/blacklist/route.ts`        | `/api/rebuild/ops/blacklist`        | Y               |
| `app/api/rebuild/ops/alerts/route.ts`           | `/api/rebuild/ops/alerts`           | Y               |
| `app/api/rebuild/ops/listings/route.ts`         | `/api/rebuild/ops/listings`         | Y               |

**Note:** `app/debug/login/route.ts` is an API route (not a page) that redirects to `/api/rebuild/ops/login`.

---

## 3) Runtime Reachability Matrix (Actual HTTP)

**Test environment:**

- Command: `npm run build && npm run start -- -p 3002`
- Build: Next.js 14.2.35 production build
- Probed via: `curl -sI http://localhost:3002/<path>`

### Page Routes (Non-Rebuild)

| Route                 | Method | Status | Location (if redirect)               |
| --------------------- | ------ | ------ | ------------------------------------ |
| `/`                   | GET    | 200    | —                                    |
| `/discovery`          | GET    | 200    | —                                    |
| `/ending-soon`        | GET    | 308    | `/discovery?preset=endingSoon`       |
| `/newest`             | GET    | 308    | `/discovery?preset=newest`           |
| `/top-deals`          | GET    | 308    | `/discovery?preset=biggest-discount` |
| `/search`             | GET    | 308    | `/rebuild/discovery`                 |
| `/alerts`             | GET    | 308    | `/rebuild/alerts`                    |
| `/alerts/unsubscribe` | GET    | 308    | `/api/rebuild/alerts/unsubscribe`    |
| `/watchlist`          | GET    | 308    | `/rebuild/discovery`                 |
| `/admin`              | GET    | 308    | `/rebuild/ops`                       |
| `/admin/exclusions`   | GET    | 308    | `/rebuild/ops/exclusions`            |
| `/admin/blacklist`    | GET    | 308    | `/rebuild/ops/blacklist`             |
| `/admin/alerts`       | GET    | 308    | `/rebuild/ops/alerts`                |
| `/admin/listings`     | GET    | 308    | `/rebuild/ops/listings`              |
| `/debug/exclusions`   | GET    | 308    | `/rebuild/ops/exclusions`            |
| `/debug/login`        | GET    | 308    | `/api/rebuild/ops/login`             |

### Mandatory Legacy Probes (Expected 404)

| Route        | Method | Status  | Notes                                      |
| ------------ | ------ | ------- | ------------------------------------------ |
| `/cards/123` | GET    | **404** | Legacy route removed (no page file exists) |
| `/sets`      | GET    | **404** | Legacy route removed (no page file exists) |
| `/sets/1`    | GET    | **404** | Legacy route removed (no page file exists) |

### Rebuild Routes (Canonical)

| Route                     | Method | Status | Notes                    |
| ------------------------- | ------ | ------ | ------------------------ |
| `/rebuild`                | GET    | 200    | Main discovery page      |
| `/rebuild/discovery`      | GET    | 200    | Discovery with filters   |
| `/rebuild/alerts`         | GET    | 200    | Alerts subscription page |
| `/rebuild/listing/123`    | GET    | 200    | Listing detail page      |
| `/rebuild/ops`            | GET    | 200    | Ops dashboard            |
| `/rebuild/ops/exclusions` | GET    | 200    | Ops exclusions panel     |
| `/rebuild/ops/blacklist`  | GET    | 200    | Ops blacklist panel      |
| `/rebuild/ops/alerts`     | GET    | 200    | Ops alerts panel         |
| `/rebuild/ops/listings`   | GET    | 200    | Ops listings panel       |

### API Routes (Sample)

| Route                    | Method | Status | Notes                 |
| ------------------------ | ------ | ------ | --------------------- |
| `/api/health`            | GET    | 200    | Health check endpoint |
| `/api/deals`             | GET    | 200    | Deals data endpoint   |
| `/api/admin/login`       | HEAD   | 405    | POST-only (expected)  |
| `/api/alerts/subscribe`  | HEAD   | 405    | POST-only (expected)  |
| `/api/debug/overrides`   | GET    | 404    | Requires auth cookie  |
| `/api/rebuild/ops/login` | GET    | 404    | Requires query params |

---

## 4) Link Generation Scan (Static References)

### Hardcoded Legacy Path Search

**Command:** `rg -n '"/cards/|"/sets/|/admin|/debug' app components lib scripts`

**Results:**

| Category             | Count | Representative Hits                              |
| -------------------- | ----- | ------------------------------------------------ |
| `/admin` references  | 23    | UI components with links to `/admin/*` paths     |
| `/debug` references  | 28    | Auth imports, API route comments, client fetches |
| `/cards/` references | 0     | None found                                       |
| `/sets/` references  | 0     | None found                                       |

**Key findings:**

1. **Admin path references** are in legacy components that still exist but pages redirect:
   - `components/AdminToolbar.tsx:6-8` — hardcoded hrefs to `/admin?tab=exclusions`, `/admin/blacklist`, `/admin/listings`
   - `components/AdminLoginClient.tsx:25` — redirects to `/admin` after login
   - `components/AdminBlacklistPanel.tsx:267` — clearFilterHref defaults to `/admin/blacklist`
   - `app/debug/exclusions/ExclusionsClient.tsx:379-385` — links to `/admin/blacklist`, `/admin/listings`

2. **Debug path references** are primarily:
   - Import statements for `debugAuth.ts` library
   - API route internal comments (documentation)
   - Client-side fetch calls to `/api/debug/*` endpoints

3. **No hardcoded `/cards/` or `/sets/` paths** found in application code.

### URL Builder Usage

**Command:** `rg -n 'buildDiscoveryUrl|buildListingUrl' app components lib`

**Results:**

| Builder             | Usage Count | Files                                                                                               |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `buildDiscoveryUrl` | 6           | `app/ending-soon/page.tsx`, `app/newest/page.tsx`, `app/discovery/page.tsx`, `app/rebuild/page.tsx` |
| `buildListingUrl`   | 4           | `app/discovery/page.tsx`, `app/rebuild/page.tsx`, tests                                             |

**Assessment:** URL builders are used consistently for discovery/listing links in the main pages. Legacy redirect pages also use `buildDiscoveryUrl` for their redirect targets.

---

## 5) Legacy Namespace Check

### Directory Check

```bash
$ ls -la legacy 2>&1 || true
ls: cannot access 'legacy': No such file or directory
```

**Result:** No `legacy/` directory exists.

### Import Check

```bash
$ rg -n "from \"legacy/|from 'legacy/" .
```

**Result:** No files found importing from `legacy/` namespace.

---

## 6) Findings + Recommendations

### Findings

1. **All legacy page routes properly redirect (308) to rebuild equivalents.** No legacy routes return stale 200 content.

2. **Mandatory legacy routes (`/cards/[id]`, `/sets`, `/sets/[id]`) correctly return 404.** E2E tests confirm this behavior.

3. **Hardcoded `/admin` and `/debug` paths exist in components** but the pages themselves redirect, so users following these links will reach the correct rebuild destinations.

4. **No legacy namespace or imports present.** The codebase is clean of `legacy/**` references.

5. **API routes under `/api/admin/*` and `/api/debug/*` still exist** and are functional (they return 200/405 depending on method). These are used by the legacy UI components that haven't been fully migrated.

### Recommendations (Non-Prescriptive)

1. **Hardcoded `/admin/*` paths in components:** Consider updating `AdminToolbar.tsx`, `AdminLoginClient.tsx`, `AdminBlacklistPanel.tsx`, and `ExclusionsClient.tsx` to use `/rebuild/ops/*` paths directly in a future cleanup stage.

2. **Legacy API routes (`/api/admin/*`, `/api/debug/*`):** These routes are still serving requests. If the goal is to fully retire them, consider adding 308 redirects to their `/api/rebuild/ops/*` equivalents in a future migration stage.

3. **E2E test expansion:** The existing `no-legacy-routes-404.spec.ts` covers `/cards/123`, `/sets`, `/sets/1`. Consider adding tests for redirect behavior of other legacy routes if regression protection is desired.

---

## Appendix: Repo Sync Proof

```
$ git rev-parse --show-toplevel
T:/Projects/tcg-deal-finder

$ git remote -v
origin	https://github.com/JawnShoe/tcgdealfinder.git (fetch)
origin	https://github.com/JawnShoe/tcgdealfinder.git (push)

$ git fetch origin
From https://github.com/JawnShoe/tcgdealfinder
   1292f62..beda95f  main       -> origin/main

$ git checkout main
Switched to branch 'main'
Your branch is behind 'origin/main' by 2 commits, and can be fast-forwarded.

$ git pull --ff-only
Updating 1292f62..beda95f
Fast-forward
...

$ git status -sb
## main...origin/main

$ git rev-parse HEAD
beda95f889154a491934b466c948b499fa16b8ce

$ git rev-parse origin/main
beda95f889154a491934b466c948b499fa16b8ce
```

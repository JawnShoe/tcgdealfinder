# REBASELINE v1 — Criticality Map

**Created**: 2025-12-29
**Purpose**: Label folders by production criticality for module review prioritization.

---

## Criticality Labels

| Label                   | Definition                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| **Production-critical** | Directly affects user-facing functionality or data integrity            |
| **Supporting**          | Supports production but not user-facing (CI, tooling, scripts)          |
| **Historical**          | Archived docs, one-off scripts, or deprecated code (kept for reference) |
| **Dead (candidate)**    | Potentially unused; requires verification before removal                |

---

## Top-Level Folders

| Folder        | Criticality         | Notes                                        |
| ------------- | ------------------- | -------------------------------------------- |
| `app/`        | Production-critical | Next.js pages and API routes                 |
| `components/` | Production-critical | React components used across pages           |
| `lib/`        | Production-critical | Core business logic, utilities, DB access    |
| `types/`      | Production-critical | TypeScript type definitions                  |
| `hooks/`      | Production-critical | React hooks                                  |
| `migrations/` | Production-critical | Database schema changes                      |
| `public/`     | Production-critical | Static assets                                |
| `.github/`    | Supporting          | CI workflows, Dependabot config              |
| `.husky/`     | Supporting          | Git hooks (pre-commit)                       |
| `scripts/`    | Supporting          | Data pipeline scripts, maintenance utilities |
| `docs/`       | Supporting          | Documentation                                |
| `.claude/`    | Supporting          | Claude Code settings                         |

---

## Key Subfolders

### `app/` Subfolders

| Subfolder          | Criticality         | Notes                                   |
| ------------------ | ------------------- | --------------------------------------- |
| `app/api/`         | Production-critical | API routes (deals, health, admin, etc.) |
| `app/admin/`       | Production-critical | Admin panel pages                       |
| `app/debug/`       | Supporting          | Debug-only pages (not user-facing)      |
| `app/cards/`       | Production-critical | Card detail pages                       |
| `app/sets/`        | Production-critical | Set listing and detail pages            |
| `app/catalog/`     | Production-critical | Catalog browser                         |
| `app/top-deals/`   | Production-critical | Top deals page                          |
| `app/newest/`      | Production-critical | Newest listings page                    |
| `app/ending-soon/` | Production-critical | Ending soon page                        |
| `app/watchlist/`   | Production-critical | Watchlist page                          |
| `app/alerts/`      | Production-critical | Public alerts page                      |
| `app/search/`      | Production-critical | Search page                             |

### `lib/` Subfolders

| Subfolder        | Criticality | Notes                      |
| ---------------- | ----------- | -------------------------- |
| `lib/__tests__/` | Supporting  | Unit and integration tests |

### `scripts/` Subfolders

| Subfolder             | Criticality | Notes                                    |
| --------------------- | ----------- | ---------------------------------------- |
| `scripts/__tests__/`  | Supporting  | Script tests                             |
| `scripts/migrations/` | Supporting  | Legacy migration scripts (not canonical) |
| `scripts/one-off/`    | Historical  | One-time scripts (kept for reference)    |

### `docs/` Subfolders

| Subfolder          | Criticality | Notes                  |
| ------------------ | ----------- | ---------------------- |
| `docs/archive/`    | Historical  | Archived docs          |
| `docs/audit/`      | Supporting  | Audit reports          |
| `docs/design/`     | Supporting  | Design docs (advisory) |
| `docs/ops/`        | Supporting  | Operational docs       |
| `docs/plan/`       | Supporting  | Planning docs          |
| `docs/ui/`         | Supporting  | UI contracts           |
| `docs/rebaseline/` | Supporting  | Rebaseline artifacts   |

---

## Dead Code Candidates (Requires Verification)

| Path                           | Reason                                                  | Status           |
| ------------------------------ | ------------------------------------------------------- | ---------------- |
| `lib/ebayStorefront.ts`        | Storefront enrichment deprecated (Shopping API retired) | Dead (candidate) |
| `cheerio` (package.json)       | Used only by ebayStorefront.ts                          | Dead (candidate) |
| `@types/dotenv` (package.json) | Modern dotenv includes types                            | Dead (candidate) |
| `ts-node` (package.json)       | tsx is preferred; ts-node may be unused                 | Dead (candidate) |
| `scripts/one-off/*`            | One-time scripts; verify none are still needed          | Historical       |

---

## Bloat Candidates (Requires Refactoring Review)

| Path                                        | Size   | Notes                                    |
| ------------------------------------------- | ------ | ---------------------------------------- |
| `components/CardDetailClient.tsx`           | 65 KB  | Large component; consider splitting      |
| `components/DealsTable.tsx`                 | 63 KB  | Large component; consider splitting      |
| `app/debug/exclusions/ExclusionsClient.tsx` | 56 KB  | Debug-only; lower priority               |
| `lib/blacklist.ts`                          | 43 KB  | Mostly data (keyword list); acceptable   |
| `PROJECT_SSOT.md`                           | 123 KB | Growing SSOT; may need archival strategy |

---

## Risk Summary

| Risk Category    | Count | Examples                                                            |
| ---------------- | ----- | ------------------------------------------------------------------- |
| Dead (candidate) | 5     | ebayStorefront.ts, cheerio, @types/dotenv, ts-node, one-off scripts |
| Bloat (refactor) | 3     | CardDetailClient.tsx, DealsTable.tsx, PROJECT_SSOT.md               |
| Historical       | 2     | docs/archive/, scripts/one-off/                                     |

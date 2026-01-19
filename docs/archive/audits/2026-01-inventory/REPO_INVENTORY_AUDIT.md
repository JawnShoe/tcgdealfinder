# Repo Inventory & Understanding Audit

**Date**: 2026-01-18
**Commit**: `6bc82d7c3334daaf543ead9db8b85e5aa9fb20a5`
**Branch**: `origin/main`

---

## 1. Repo Inventory Table

### Top-Level Directories

| Path          | Type      | Purpose                                     | Used by                           | Last Modified | Notes                                                                      |
| ------------- | --------- | ------------------------------------------- | --------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `app/`        | Directory | Next.js App Router pages and API routes     | Next.js framework                 | 2026-01-18    | 75 files, 66 directories. Contains both legacy and rebuild surfaces        |
| `components/` | Directory | React UI components                         | `app/` pages                      | 2026-01-18    | 41 files. Includes `rebuild/` subdirectory for rebuild-specific components |
| `lib/`        | Directory | Shared business logic, utilities, tests     | `app/`, `components/`, `scripts/` | 2026-01-18    | 100+ files. Includes `rebuild/` subdirectory for rebuild-specific logic    |
| `scripts/`    | Directory | CLI utilities, backfills, migrations, tests | CI workflows, manual ops          | 2026-01-18    | 100+ files. Mix of production scripts and one-off utilities                |
| `tests/`      | Directory | E2E Playwright tests and fixtures           | CI `e2e-smoke` job                | 2026-01-18    | 7 files. Rebuild-focused E2E tests                                         |
| `docs/`       | Directory | Project documentation                       | Contributors                      | 2026-01-18    | See detailed docs inventory below                                          |
| `.github/`    | Directory | GitHub workflows and PR templates           | GitHub Actions                    | 2026-01-10    | 6 workflow files + PR template                                             |
| `migrations/` | Directory | SQL migration files                         | `scripts/init-db.ts`, CI          | 2026-01-11    | 15 numbered migration files                                                |
| `rebuild/`    | Directory | Rebuild pipeline utilities                  | `lib/rebuild/`                    | 2026-01-11    | 1 file: `pipeline/getRebuildListing.ts`                                    |
| `types/`      | Directory | TypeScript type definitions                 | `app/api/`, `components/`         | 2025-12-29    | 2 files: `deal.ts`, `dealsApi.ts`                                          |
| `skills/`     | Directory | Claude Code custom skills                   | Claude Code agents                | 2026-01-05    | 4 files. Process enforcement skills                                        |
| `public/`     | Directory | Static assets                               | Next.js                           | 2025-11-25    | Empty directory                                                            |
| `.husky/`     | Directory | Git hooks                                   | `git commit`                      | 2025-12-24    | Pre-commit hooks (lint-staged)                                             |
| `.claude/`    | Directory | Claude Code configuration                   | Claude Code                       | 2026-01-18    | Agent configurations                                                       |

### Root Configuration Files

| Path                 | Type    | Purpose                        | Used by            | Notes                                   |
| -------------------- | ------- | ------------------------------ | ------------------ | --------------------------------------- |
| `package.json`       | Config  | Node dependencies, scripts     | npm, CI            | Node 18.17+, Next.js 14.2, React 18.3   |
| `package-lock.json`  | Config  | Locked dependency versions     | npm ci             | Auto-generated                          |
| `tsconfig.json`      | Config  | TypeScript configuration       | tsc, IDE           | `@/*` path aliases, excludes scripts    |
| `next.config.mjs`    | Config  | Next.js configuration          | next build         | Sentry integration, image domains       |
| `eslint.config.mjs`  | Config  | ESLint rules (flat config)     | npm run lint       | Legacy import boundary enforcement      |
| `tailwind.config.js` | Config  | Tailwind CSS configuration     | postcss            | Standard config                         |
| `postcss.config.js`  | Config  | PostCSS configuration          | Next.js build      | Tailwind plugin                         |
| `.prettierrc.json`   | Config  | Prettier formatting rules      | npm run format     | Standard config                         |
| `.prettierignore`    | Config  | Prettier ignore patterns       | prettier           | Ignores .next, node_modules             |
| `.gitignore`         | Config  | Git ignore patterns            | git                | Standard Next.js ignores                |
| `.lighthouserc.cjs`  | Config  | Lighthouse CI configuration    | CI perf-budget job | Rebuild page performance gates          |
| `.env.example`       | Config  | Environment variable template  | New contributors   | DATABASE_URL, EBAY keys, etc.           |
| `middleware.ts`      | Runtime | Next.js middleware             | Next.js            | Request ID injection for rebuild routes |
| `instrumentation.ts` | Runtime | Sentry initialization          | Next.js            | PII scrubbing, error tracking           |
| `sentry.*.config.ts` | Config  | Sentry configuration (3 files) | Sentry SDK         | Client, server, edge configs            |

### Governance Files

| Path                      | Type       | Purpose                          | Notes                              |
| ------------------------- | ---------- | -------------------------------- | ---------------------------------- |
| `CLAUDE.md`               | Governance | Entry point, authority chain     | Single source of truth declaration |
| `AGENTS.md`               | Governance | Codex adapter for Claude rules   | Mirrors CLAUDE.md for Codex        |
| `PROJECT_SSOT.md`         | Governance | Project status, priorities       | ~130KB, comprehensive state doc    |
| `SHIFT_LOCK.md`           | Governance | Process gates, locks, stop rules | Merge gates, evidence requirements |
| `REGRESSION_CHECKLIST.md` | Governance | Manual test checklists           | Per-feature smoke tests            |
| `README.md`               | Reference  | Project introduction             | Basic setup instructions           |

### Temporary/Working Files (Not Tracked)

| Pattern                          | Purpose                 | Notes                           |
| -------------------------------- | ----------------------- | ------------------------------- |
| `.tmp_*`                         | Temporary working files | CI logs, PR bodies, branch info |
| `_content*.txt`                  | Debug content dumps     | Card/listing debug output       |
| `*.bak`                          | Backup files            | Gitignored                      |
| `branchvv.txt`, `pr_body.md`     | Working artifacts       | Should be gitignored            |
| `import-log.txt`, `temp_pkg.txt` | Import/debug logs       | Gitignored                      |

---

## 2. Directory Deep Dives

### `app/` Structure (66 subdirectories)

```
app/
├── admin/              # Legacy admin UI (5 pages)
│   ├── alerts/
│   ├── blacklist/
│   ├── exclusions/
│   └── listings/
├── alerts/             # Legacy alerts pages
├── api/                # API routes
│   ├── admin/          # Legacy admin API (10 routes)
│   ├── alerts/         # Legacy alerts API
│   ├── cards/          # Card data API
│   ├── deals/          # Deals query API
│   ├── debug/          # Debug endpoints
│   ├── health/         # Health check
│   ├── historicals/    # Historical price data
│   ├── listings/       # Listing lookup
│   ├── market/         # Market data
│   ├── rebuild/        # REBUILD API routes (7 subdirs)
│   │   ├── alerts/
│   │   ├── ops/
│   │   └── outbound-click/
│   └── search-cards/   # Card search
├── debug/              # Debug UI
│   ├── exclusions/
│   └── login/
├── discovery/          # Legacy discovery page
├── ending-soon/        # Legacy ending-soon page
├── newest/             # Legacy newest page
├── rebuild/            # REBUILD UI (main rebuild surfaces)
│   ├── alerts/
│   ├── discovery/
│   ├── listing/[id]/
│   └── ops/            # Rebuild admin tools
├── search/             # Search page
├── top-deals/          # Top deals page
└── watchlist/          # Watchlist page
```

**Key Observations**:

- Clear separation between legacy (`admin/`, `alerts/`, `discovery/`) and rebuild (`rebuild/`) surfaces
- API routes mirror UI structure
- `rebuild/` is the active development surface

### `lib/` Structure

```
lib/
├── __tests__/
│   ├── integration/    # 4 files (require DATABASE_URL)
│   └── unit/           # 25 files (no DB required)
├── observability/      # Logging, metrics
├── rebuild/            # REBUILD business logic
│   ├── alerts/
│   ├── compliance/
│   ├── data/
│   ├── dedupe/
│   ├── intelligence/
│   ├── observability/
│   ├── prefs/
│   ├── resilience/
│   ├── scripts/
│   ├── security/
│   ├── seo/
│   ├── signals/
│   └── trust/
└── [root files]        # 35+ shared utilities
```

**Key Observations**:

- Rebuild logic is fully isolated in `lib/rebuild/`
- Two separate DB modules: `lib/db.ts` (legacy) and `lib/rebuild/db.ts` (rebuild)
- Comprehensive test coverage in `__tests__/`

### `scripts/` Structure

```
scripts/
├── __tests__/unit/     # 3 unit test files
├── migrations/         # SQL migration files (legacy location)
│   └── archive/        # Archived migrations
├── one-off/            # 30+ one-off debug/check scripts
└── [root files]        # 50+ operational scripts
```

**Categories of Scripts**:

1. **Data pipelines** (CI-integrated): `update-listings.ts`, `update-historical-prices.ts`, `update-fx-rates-auto.ts`, `check-alerts.ts`
2. **Backfills**: `backfill-*.ts` (collector numbers, deal confidence, language, market)
3. **DB operations**: `init-db.ts`, `seed-cards.ts`, `run-migration.ts`
4. **Debug/audit**: `check-*.ts`, `debug-*.ts`, `verify-*.ts`, `audit-*.ts`
5. **CI gates**: `primitive-enforcer.sh`, `visual-contract-guardrails.sh`, `data-sanity-gate.sh`
6. **One-off utilities**: `one-off/` subdirectory (historical debug scripts)

### `.github/workflows/` Structure

| Workflow                    | Purpose                   | Triggers         |
| --------------------------- | ------------------------- | ---------------- |
| `ci.yml`                    | Main CI pipeline          | push, PR         |
| `data-pipelines.yml`        | Automated data refresh    | schedule, manual |
| `dependabot-auto-merge.yml` | Auto-merge Dependabot PRs | Dependabot PRs   |
| `job-silence-watchdog.yml`  | Monitor for stalled jobs  | schedule         |
| `ops-enable-alerts.yml`     | Alert enablement ops      | manual           |
| `dependabot.yml`            | Dependabot configuration  | N/A (config)     |

**CI Jobs**:

- `lint-and-build`: Lint, typecheck, unit tests, build
- `e2e-smoke`: Playwright E2E tests (rebuild surfaces)
- `synthetic-guarantee`: Synthetic data guarantee tests
- `visual-regression`: CLS gate tests
- `a11y-smoke`: Accessibility tests
- `perf-budget`: Lighthouse performance budget

---

## 3. Docs Inventory (Non-Rebuild)

### Authoritative (Active, Maintained)

| Path                                 | Purpose                  | Last Commit | Referenced By     |
| ------------------------------------ | ------------------------ | ----------- | ----------------- |
| `docs/INDEX.md`                      | Documentation map        | 2026-01-03  | CLAUDE.md         |
| `docs/TIER2_ARCHITECTURE.md`         | Tier 2 architecture spec | 2026-01-02  | CLAUDE.md routing |
| `docs/DB_MIGRATIONS_RUNBOOK.md`      | Migration procedures     | 2025-12-24  | CLAUDE.md routing |
| `docs/ENV_RUNBOOK.md`                | Environment config       | 2026-01-02  | CLAUDE.md routing |
| `docs/DEFINITION_OF_READY.md`        | Readiness checklist      | 2025-12-24  | CLAUDE.md routing |
| `docs/RELEASES.md`                   | Release procedures       | 2025-12-24  | CLAUDE.md routing |
| `docs/ui/UI_CONSISTENCY_CONTRACT.md` | UI governance            | 2025-12-23  | CLAUDE.md routing |
| `docs/ui/TOOLTIP_INVENTORY.md`       | Tooltip catalog          | 2026-01-04  | UI contract       |

### Operational (Reference)

| Path                                     | Purpose              | Last Commit | Classification |
| ---------------------------------------- | -------------------- | ----------- | -------------- |
| `docs/BACKUP_POLICY.md`                  | Backup procedures    | 2025-12-24  | Operational    |
| `docs/EVIDENCE_PACKET_TEMPLATE.md`       | PR evidence template | 2025-12-24  | Operational    |
| `docs/market-policy.md`                  | Multi-market rules   | 2025-12-28  | Operational    |
| `docs/surfaces.md`                       | Feature surface map  | 2025-12-16  | Operational    |
| `docs/WORKSTREAMS_MASTER.md`             | Workstream tracking  | 2026-01-04  | Operational    |
| `docs/CLEANUP_INVENTORY.md`              | Cleanup candidates   | 2026-01-03  | Operational    |
| `docs/ops/EBAY_AGC_SUBMISSION_PACKET.md` | eBay AGC docs        | 2025-12-29  | Operational    |

### Historical/Planning (Non-Executable)

| Path                                                                    | Purpose                 | Last Commit | Classification        |
| ----------------------------------------------------------------------- | ----------------------- | ----------- | --------------------- |
| `docs/design/DESIGN_AUDIT_2025-01.md`                                   | External design audit   | 2025-12-29  | Historical (advisory) |
| `docs/design/DESIGN_PHASES.md`                                          | Phased redesign plan    | 2025-12-29  | Historical (advisory) |
| `docs/plan/OPTION_A_IMPLEMENTATION_PLAN.md`                             | Option A implementation | 2025-12-29  | Historical            |
| `docs/plan/SOLD_DATA_SOURCE_OPTIONS.md`                                 | Sold data options       | 2025-12-29  | Historical            |
| `docs/audit/PRODUCT_TRUTH_PHILOSOPHY_AUDIT_OPTION_A.md`                 | Truth philosophy audit  | 2025-12-29  | Historical            |
| `docs/incidents/INCIDENT_2026-01-05_tooltip-portal-data-reliability.md` | Incident report         | 2026-01-05  | Historical            |
| `docs/db/INDEX_AUDIT_P2.2.md`                                           | Index audit             | 2026-01-02  | Historical            |

### Rebaseline Artifacts (Completed)

| Path                                        | Purpose            | Last Commit              | Classification |
| ------------------------------------------- | ------------------ | ------------------------ | -------------- |
| `docs/rebaseline/REPO_PACKET_2025-12-29.md` | Repo inventory     | 2025-12-29               | Historical     |
| `docs/rebaseline/CRITICALITY_MAP.md`        | Folder criticality | 2025-12-29               | Historical     |
| `docs/rebaseline/MODULE_REVIEW_PLAN.md`     | Module review plan | 2025-12-29               | Historical     |
| `docs/rebaseline/modules/M01-M10`           | Module reviews     | 2025-12-29 to 2025-12-31 | Historical     |

### Archive (Non-Executable)

| Path                                    | Content                              | Last Commit              | Classification |
| --------------------------------------- | ------------------------------------ | ------------------------ | -------------- |
| `docs/archive/`                         | 14 historical implementation records | 2025-12-23 to 2026-01-03 | Historical     |
| `docs/archive/audits/`                  | 2 audit artifacts                    | 2026-01-02               | Historical     |
| `docs/archive/audits/2025-full-system/` | 14 full system audit docs            | 2025-12-26               | Historical     |

### Rebuild Canonical (in docs/rebuild/)

| Path                                | Purpose                | Last Commit | Classification    |
| ----------------------------------- | ---------------------- | ----------- | ----------------- |
| `docs/rebuild/PRD_LITE.md`          | Rebuild PRD            | 2026-01-07  | Rebuild Canonical |
| `docs/rebuild/TRUST_METRICS.md`     | Trust metrics spec     | 2026-01-14  | Rebuild Canonical |
| `docs/rebuild/NON_NEGOTIABLES.md`   | Non-negotiables        | 2026-01-12  | Rebuild Canonical |
| `docs/rebuild/CONTRACTS.md`         | Component contracts    | 2026-01-16  | Rebuild Canonical |
| `docs/rebuild/RELEASE_CHECKLIST.md` | Release checklist      | 2026-01-15  | Rebuild Canonical |
| `docs/rebuild/ADR_LOG.md`           | Architecture decisions | 2026-01-15  | Rebuild Canonical |
| `docs/rebuild/VISUAL_CONTRACT.md`   | Visual contract        | 2026-01-18  | Rebuild Canonical |
| `docs/rebuild/REBUILD_TRACKER.md`   | Rebuild progress       | 2026-01-15  | Rebuild Canonical |
| `docs/rebuild/TRACKER_EVIDENCE.md`  | Tracker evidence       | 2026-01-18  | Rebuild Canonical |
| `docs/rebuild/LEGACY_QUARANTINE.md` | Legacy quarantine list | 2026-01-18  | Rebuild Canonical |

---

## 4. Dependency / Reference Scan

### Cross-Directory Import Summary

| From → To                  | Count     | Pattern                |
| -------------------------- | --------- | ---------------------- |
| `app/` → `@/lib/`          | 67 files  | Standard lib imports   |
| `app/` → `@/components/`   | 12 files  | UI component imports   |
| `components/` → `@/lib/`   | 30+ files | Business logic imports |
| `tests/` → `@/components/` | 2 files   | E2E test imports       |
| `lib/` → `@/types/`        | 4 files   | Type imports           |

### Scripts Referenced by CI

| Script                                  | Workflow              | Purpose                       |
| --------------------------------------- | --------------------- | ----------------------------- |
| `scripts/init-db.ts`                    | ci.yml (5 jobs)       | DB schema init                |
| `scripts/visual-contract-guardrails.sh` | ci.yml                | UI contract enforcement       |
| `scripts/primitive-enforcer.sh`         | ci.yml                | Rebuild primitive enforcement |
| `scripts/data-sanity-gate.sh`           | ci.yml                | Data validation               |
| `scripts/update-listings.ts`            | data-pipelines.yml    | Listing refresh               |
| `scripts/update-fx-rates-auto.ts`       | data-pipelines.yml    | FX rate updates               |
| `scripts/update-historical-prices.ts`   | data-pipelines.yml    | Historical prices             |
| `scripts/update-sold-listings.ts`       | data-pipelines.yml    | Sold listings                 |
| `scripts/run-migration.ts`              | ops-enable-alerts.yml | Migration runner              |
| `scripts/verify-migration-005.ts`       | ops-enable-alerts.yml | Migration verification        |
| `scripts/e2e-test-alerts.ts`            | ops-enable-alerts.yml | Alert E2E tests               |

### Surprising Couplings

1. **Two DB modules**: `lib/db.ts` and `lib/rebuild/db.ts` both connect to the same database but use separate global pool variables (`pgPool` vs `rebuildPgPool`). This appears intentional for isolation.

2. **Legacy/Rebuild boundary is enforced**:
   - ESLint config blocks `legacy/**` imports in rebuild surfaces
   - CI checks for legacy imports in `app/rebuild` and `lib/rebuild`
   - No actual `legacy/` directory exists (quarantine is conceptual)

3. **Scripts are excluded from tsconfig**: Scripts directory is explicitly excluded, allowing looser TypeScript rules for utility scripts.

4. **Docs reference code paths**: Some docs reference specific file paths (e.g., `docs/rebuild/CONTRACTS.md` references `components/rebuild/`). These should stay synchronized.

5. **One-off scripts accumulation**: `scripts/one-off/` contains 30+ debug scripts from development. These are not used by CI but remain in the repo for historical reference.

---

## 5. Learning Notes

### For Someone New to This Repo

**What is this?**
A Next.js application for finding underpriced Pokemon TCG (Trading Card Game) listings on eBay and other marketplaces. It tracks deals, calculates discounts based on historical sold prices, and provides alerts.

**Architecture at a glance**:

- **Frontend**: Next.js App Router with React Server Components
- **Backend**: Next.js API routes + PostgreSQL
- **Data pipeline**: Scheduled GitHub Actions for listing updates, price history, FX rates
- **Observability**: Sentry for error tracking

**The "Rebuild" concept**:
The codebase is undergoing a phased rebuild. New development happens in:

- `app/rebuild/` - UI surfaces
- `lib/rebuild/` - Business logic
- `components/rebuild/` - UI components
- `docs/rebuild/` - Specifications

Legacy surfaces exist at root level (`app/admin/`, `app/alerts/`, etc.) but are deprecated.

### What Confused Me

1. **Two parallel surface trees**: The `app/` directory has both legacy pages (root level) and rebuild pages (`app/rebuild/`). It's not immediately obvious which is active.

2. **docs/ vs PROJECT_SSOT.md**: Most project state is in the massive `PROJECT_SSOT.md` at root level, but `docs/` has overlapping content. The authority chain in `CLAUDE.md` clarifies this.

3. **Scripts organization**: The `scripts/` directory is large and mixed. Production scripts, one-off debug utilities, and tests all live together. The `one-off/` subdirectory helps but isn't exhaustive.

4. **Multiple governance docs**: `CLAUDE.md`, `AGENTS.md`, `PROJECT_SSOT.md`, `SHIFT_LOCK.md` all contain governance rules. The conflict resolution rules in `CLAUDE.md` clarify precedence.

### Rebuild-Core vs Leftover Context

**Rebuild-Core** (actively developed):

- `app/rebuild/`
- `lib/rebuild/`
- `components/rebuild/`
- `docs/rebuild/`
- `tests/e2e/rebuild*.spec.ts`
- CI jobs: e2e-smoke, synthetic-guarantee, visual-regression, a11y-smoke, perf-budget

**Leftover Context** (legacy, deprecated, or historical):

- `app/admin/`, `app/alerts/`, `app/discovery/` (legacy UI)
- `app/api/admin/`, `app/api/alerts/` (legacy API)
- `docs/archive/` (historical records)
- `docs/rebaseline/` (completed rebaseline audit)
- `scripts/one-off/` (debug utilities)

**Shared/Transitional**:

- `lib/` root files (shared by both legacy and rebuild)
- `components/` root files (some used by both)
- `types/` (shared type definitions)
- Core data pipeline scripts (used by production regardless of surface)

---

## 6. Repo Sync Proof

```
$ git fetch origin
$ git checkout main
Switched to branch 'main'
$ git pull --ff-only
Already up to date.

$ git rev-parse --show-toplevel
T:/Projects/tcg-deal-finder

$ git remote -v
origin	https://github.com/JawnShoe/tcgdealfinder.git (fetch)
origin	https://github.com/JawnShoe/tcgdealfinder.git (push)

$ git branch -vv
* main                                              6bc82d7 [origin/main] chore(stage4): reconcile Stage 4 SSOT docs

$ git status -sb
## main...origin/main

$ git rev-parse HEAD
6bc82d7c3334daaf543ead9db8b85e5aa9fb20a5

$ git rev-parse origin/main
6bc82d7c3334daaf543ead9db8b85e5aa9fb20a5
```

---

## Appendix: File Counts

| Directory     | Files | Subdirectories |
| ------------- | ----- | -------------- |
| `app/`        | 75    | 66             |
| `components/` | 41    | 1              |
| `lib/`        | 100+  | 15             |
| `scripts/`    | 100+  | 4              |
| `tests/`      | 7     | 2              |
| `docs/`       | 73    | 12             |
| `migrations/` | 15    | 0              |
| `.github/`    | 7     | 1              |
| `types/`      | 2     | 0              |
| `skills/`     | 5     | 3              |

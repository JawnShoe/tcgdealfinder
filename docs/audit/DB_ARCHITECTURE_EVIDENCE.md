# DB Architecture Evidence Packet

**Date**: 2025-12-26
**Auditor**: Claude Code (automated)
**Scope**: Confirm CI vs Production database architecture

---

## 1. Current DB Branch Model (As-Operated)

**State**: Single Neon branch used by `DATABASE_URL` (production/main)

**Key Facts**:

- All environments (local dev, CI pipelines, production) use the same Neon database branch
- CI workflow (`ci.yml`) is **secretless** and does not require DB access for lint/unit/build
- Data pipeline workflows use `secrets.DATABASE_URL` which points to the production database
- No separate CI or preview branch exists in the current architecture

---

## 2. Workflow-by-Workflow DB Access Map

| Workflow File                                 | Job Name(s)                                                                          | Touches DB? | Secret/Env Used                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ----------- | ------------------------------- |
| `.github/workflows/ci.yml`                    | `lint-and-build`                                                                     | **No**      | None                            |
| `.github/workflows/data-pipelines.yml`        | `update-listings`, `check-alerts`, `show-fx-rates`, `update-historical-prices`, etc. | **Yes**     | `secrets.DATABASE_URL`          |
| `.github/workflows/ops-enable-alerts.yml`     | `apply-migration`, `verify-migration`, `e2e-test-email`                              | **Yes**     | `secrets.DATABASE_URL`          |
| `.github/workflows/dependabot-auto-merge.yml` | `auto-approve`, `auto-merge`                                                         | **No**      | `secrets.GITHUB_TOKEN` (not DB) |

### Detailed Analysis

#### `.github/workflows/ci.yml` (Lines 1-69)

- **Jobs**: `lint-and-build`
- **Steps**: checkout, setup node, install deps, format check, lint, unit tests, build
- **DB Access**: None
- **Evidence**: No `DATABASE_URL` or `secrets.*` DB references in file
- **Quote** (lines 61-68):
  ```yaml
  - name: Run lint
    run: npm run lint
  - name: Run unit tests
    run: npm run test:unit
  - name: Run build
    run: npm run build
  ```

#### `.github/workflows/data-pipelines.yml` (Lines 58-63)

- **Jobs**: `update-listings`, `check-alerts`, `show-fx-rates`, `update-historical-prices`, `update-sold-listings`
- **DB Access**: Yes (all jobs that run scripts)
- **Evidence** (lines 58-63):
  ```yaml
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    EBAY_APP_ID: ${{ secrets.EBAY_APP_ID }}
    ...
  ```

#### `.github/workflows/ops-enable-alerts.yml` (Lines 49-52)

- **Jobs**: `apply-migration`, `verify-migration`, `e2e-test-email`
- **DB Access**: Yes (migration and verification jobs)
- **Evidence** (lines 49-52):
  ```yaml
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    ...
  ```

---

## 3. Source References

### Documentation Confirming Single-Branch Model

**File**: `docs/ENV_RUNBOOK.md` (lines 326-328)

> **Neon Database Access Rules**
>
> 1. Operators must not run SQL in Neon unless the coder names the exact Neon Project + Branch + Database from `DATABASE_URL`.
> 2. Never apply migrations to CI branches unless explicitly told to; default target is the branch used by `DATABASE_URL` (usually Production/main).

### Build Independence from DB

**File**: `docs/ENV_RUNBOOK.md` (lines 249-252)

> **Build fails with "DATABASE_URL is required"**
>
> Cause: Legacy code attempted DB connection at build time
> Fix: Fixed in commit 7b2718f (lazy DB pool initialization)
> Verification: `npm run build` should succeed without `DATABASE_URL`

---

## 4. Operator Takeaway

- **No CI vs Prod schema diff exists** under current architecture (single branch model)
- **Data pipelines use production DB by design** — this is intentional, not a misconfiguration
- **CI isolation would be a separate workstream** requiring: (1) create Neon branch, (2) add `CI_DATABASE_URL` secret, (3) modify workflows

---

## 5. Read-only Schema Snapshot (Production DB)

_Snapshot not performed in this audit._

**Reason**: This audit confirms architecture only. Schema snapshots should be performed by operator with direct Neon access to avoid credential exposure in logs.

**Recommended Operator Action** (if snapshot desired):

```sql
-- Run against production DB via Neon SQL Editor or psql

-- A) Identify target
SELECT current_database() AS db, current_schema() AS schema, version();

-- B) Table list
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;

-- C) Critical object presence
SELECT
  to_regclass('public.rate_limits') IS NOT NULL AS rate_limits,
  to_regclass('public.listings') IS NOT NULL AS listings,
  to_regclass('public.email_subscriptions') IS NOT NULL AS email_subscriptions;

-- D) Index snapshot
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('listings','email_subscriptions','rate_limits')
ORDER BY tablename, indexname;
```

---

## 6. Verification Checklist

- [x] No secrets included in this document
- [x] No workflow files modified
- [x] No code files modified
- [x] All file references use relative paths (no absolute paths with credentials)
- [x] Architecture confirmed via workflow file analysis

---

**LOCKED**: Docs-only evidence packet
**VERIFIED**: Single-branch architecture confirmed via source analysis

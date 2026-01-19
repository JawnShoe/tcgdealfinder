# Module 01: Dangerous Scripts Hardening

**Created**: 2025-12-29
**Status**: COMPLETE
**PR**: TBD

---

## What We Reviewed

| File                                    | Danger Type                                   | Action Taken |
| --------------------------------------- | --------------------------------------------- | ------------ |
| `scripts/purge-blacklisted-listings.ts` | `DELETE FROM listings` (bulk delete)          | HARDENED     |
| `scripts/e2e-test-alerts.ts`            | `DELETE FROM alerts_watchlist` (test cleanup) | Documented   |
| `scripts/migrations/20251215_*.sql`     | `DROP COLUMN`                                 | Documented   |
| `scripts/migrations/20251216_*.sql`     | `DROP CONSTRAINT`                             | Documented   |
| `scripts/migrations/20251219_*.sql`     | `DROP CONSTRAINT`                             | Documented   |

### Why These Files

These scripts contain destructive SQL operations (`DELETE`, `DROP`) that could cause data loss if run accidentally in production.

---

## Risks Found

| #   | Risk                                                                         | Path                                                         | Severity |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- |
| 1   | Bulk DELETE on listings table with no confirmation gate                      | `scripts/purge-blacklisted-listings.ts:117`                  | HIGH     |
| 2   | Test cleanup DELETEs (low risk: test data only, marked with E2E_TEST_MARKER) | `scripts/e2e-test-alerts.ts:162,165`                         | LOW      |
| 3   | DROP COLUMN in migration (historical, already applied)                       | `scripts/migrations/20251215_drop_seller_store_name.sql:2`   | LOW      |
| 4   | DROP CONSTRAINT in migration (historical, already applied)                   | `scripts/migrations/20251216_collector_number_hardening.sql` | LOW      |
| 5   | DROP CONSTRAINT in migration (historical, already applied)                   | `scripts/migrations/20251219_add_market_partition.sql`       | LOW      |

---

## What We Changed

### `scripts/purge-blacklisted-listings.ts`

Added a two-layer safety gate that prevents accidental data deletion:

1. **Default behavior is now dry-run** (was already the case, now more explicit)
2. **Delete mode requires `CONFIRM_DELETE=YES`** environment variable
3. **Production delete requires BOTH `CONFIRM_DELETE=YES` AND `CONFIRM_PROD_DELETE=YES`**

```typescript
function validateSafetyGates(wantsDelete: boolean): {
  allowed: boolean;
  reason?: string;
} {
  if (!wantsDelete) {
    return { allowed: true }; // Dry-run is always allowed
  }

  const confirmDelete = process.env.CONFIRM_DELETE === "YES";
  const isProduction = process.env.NODE_ENV === "production";
  const confirmProdDelete = process.env.CONFIRM_PROD_DELETE === "YES";

  if (!confirmDelete) {
    return {
      allowed: false,
      reason: "Delete mode requires CONFIRM_DELETE=YES environment variable.",
    };
  }

  if (isProduction && !confirmProdDelete) {
    return {
      allowed: false,
      reason:
        "Production delete requires BOTH CONFIRM_DELETE=YES AND CONFIRM_PROD_DELETE=YES.",
    };
  }

  return { allowed: true };
}
```

### What We Did NOT Change

- **`e2e-test-alerts.ts`**: The DELETEs are for test cleanup only, marked with `E2E_TEST_MARKER`, and only delete rows the script itself created. Low risk; no gate needed.
- **`scripts/migrations/*.sql`**: These are one-time migrations, not scripts meant to be re-run. Already applied to production. Adding gates would break migration tooling.

---

## How to Run Safely

### Dry-run (always safe, default)

```bash
npx tsx scripts/purge-blacklisted-listings.ts
```

This scans listings and shows what would be deleted, without deleting anything.

### Delete mode (non-production)

```bash
CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete
```

Requires explicit `CONFIRM_DELETE=YES` to proceed.

### Delete mode (production)

```bash
CONFIRM_PROD_DELETE=YES CONFIRM_DELETE=YES npx tsx scripts/purge-blacklisted-listings.ts --delete
```

Requires BOTH flags when `NODE_ENV=production`.

---

## Acceptance Criteria

- [x] Safety gate added to `purge-blacklisted-listings.ts`
- [x] Default behavior is dry-run (no data changes)
- [x] Delete mode requires explicit `CONFIRM_DELETE=YES`
- [x] Production delete requires additional `CONFIRM_PROD_DELETE=YES`
- [x] Other dangerous scripts inventoried and documented
- [x] Lint passes
- [x] Build passes
- [x] test:unit passes

---

## Future Work (Not in This PR)

- Consider adding similar gates to other high-risk scripts (if any are identified in future modules)
- Consider adding a `--list-dangerous-ops` flag to scan scripts for DELETE/DROP patterns

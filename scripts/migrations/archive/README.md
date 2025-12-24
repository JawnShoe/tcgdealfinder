# Archived Migrations

**Purpose**: Historical migration duplicates archived during repository hygiene.

**Status**: These are NOT production migrations. Canonical migrations live in `migrations/` directory.

---

## Archive Contents

| File | Date Archived | Reason |
|------|---------------|--------|
| `add_listing_integrity_fields.sql` | 2025-12-23 | Duplicate of `migrations/002_add_listing_integrity_fields.sql` (canonical version kept) |

---

## Why These Were Archived

These SQL files were duplicates of canonical migrations already tracked in the main `migrations/` directory. The canonical versions are:
- Properly numbered (e.g., `002_*.sql`)
- Referenced by application code (e.g., `lib/schema.ts`)
- Part of the official migration sequence

The archived duplicates here had:
- No references in code or documentation
- Functionally identical SQL (minor comment differences)
- Unclear purpose/origin

---

## Production Migrations

For the authoritative migration sequence, see:
- `migrations/` directory (root level)
- Database migration tracking table

Refer to [package.json](../../../package.json) for migration execution scripts.

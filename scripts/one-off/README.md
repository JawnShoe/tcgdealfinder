# One-Off Scripts

**Purpose**: Historical debug, verification, and migration scripts used during development.

**Status**: Not production scripts. These are one-time or ad-hoc verification tools.

---

## Contents

This directory contains root-level scripts moved during repository hygiene (2025-12-23):

### Check Scripts
Database and schema verification scripts used during development:
- `check-*.ts` - Various database content checks (Lugia cards, Silver Tempest, schema validation, etc.)

### Test Scripts
One-time API and integration tests:
- `test-*.ts`, `test-*.mjs` - API health checks, market tests, card fetching tests

### Utility Scripts
Ad-hoc migration and verification utilities:
- `final-*.ts` - Final verification before releases
- `verify-*.ts` - Database verification checks
- `progress.ts`, `quick-check.ts` - Development helpers
- `run-migration.ts` - One-time migration runner
- `add-pokemontcg-cols.ts` - Schema migration helper

---

## How to Run Safely

These scripts are **not production tools**. They were used for one-time checks during specific development phases.

If you need to run one:

```bash
# Most use tsx (TypeScript execution)
npx tsx scripts/one-off/check-cards.ts

# Some older ones use ts-node
npx ts-node scripts/one-off/test-api.ts
```

**Important**:
- These scripts may reference stale DB schemas or old APIs
- They are not maintained or tested
- Use at your own risk for reference only
- Production scripts live in `scripts/` (not `scripts/one-off/`)

---

## Production Scripts

For maintained, production-ready scripts, see:
- `scripts/update-listings.ts` - Live listing updates
- `scripts/backfill-*.ts` - Data backfill utilities
- `scripts/ingest_pokemon_sets.ts` - Set catalog ingestion

Refer to [package.json](../../package.json) for npm script aliases.

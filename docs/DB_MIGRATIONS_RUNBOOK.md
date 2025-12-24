# Database Migrations Runbook

**Purpose**: Document database migration workflow, application procedures, and rollback strategies.

**Last Updated**: 2025-12-24

---

## Migration File Locations

### Primary Migrations Directory

**Path**: `migrations/`

**Purpose**: Schema-level migrations applied directly in Neon SQL editor

**Files**:
- `001_add_fx_rates.sql`
- `002_add_listing_integrity_fields.sql`
- `003_add_catalog_set_fields.sql`
- `004_add_seller_blacklist_history.sql`

**Naming convention**: `NNN_description.sql` (sequential numbers)

### Scripts Migrations Directory

**Path**: `scripts/migrations/`

**Purpose**: Application-layer migrations and data transformations

**Files**: Various timestamped and numbered migrations
- Timestamped: `YYYYMMDD_description.sql`
- Numbered: `NNN_description.sql`
- TypeScript: `*.ts` for complex data migrations

**Archive**: `scripts/migrations/archive/` contains superseded or duplicate migrations

---

## Migration Application Workflow

### Schema Migrations (Neon SQL Editor)

**When to use**: DDL changes (CREATE TABLE, ALTER TABLE, CREATE INDEX, etc.)

**Procedure**:

1. **Create migration file** in `migrations/` directory:
   ```sql
   -- migrations/005_add_new_feature.sql

   -- Description of what this migration does
   -- Date: YYYY-MM-DD

   ALTER TABLE listings ADD COLUMN new_field TEXT;
   CREATE INDEX idx_listings_new_field ON listings(new_field);
   ```

2. **Review migration locally**:
   - Read the SQL carefully
   - Verify syntax
   - Check for destructive operations (DROP, TRUNCATE)
   - Ensure idempotency where possible

3. **Apply in Neon**:
   - Open Neon project dashboard
   - Navigate to SQL Editor
   - Copy migration file contents
   - Execute in SQL Editor
   - Verify success (check "Messages" panel for errors)

4. **Verify migration applied**:
   ```sql
   -- Check table structure
   \d table_name

   -- Or use Neon table inspector
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'your_table';
   ```

5. **Update schema documentation**:
   - If `lib/schema.ts` exists and documents schema, update it
   - Update PROJECT_SSOT.md with migration note and commit hash

### Data Migrations (Scripts)

**When to use**: Data transformations, backfills, one-time data operations

**Procedure**:

1. **Create migration script** in `scripts/migrations/`:
   ```bash
   # Example: scripts/migrations/20251224_backfill_new_field.ts
   ```

2. **Test locally first** (if safe):
   ```bash
   # Review script before running
   cat scripts/migrations/20251224_backfill_new_field.ts

   # Run with caution
   npx tsx scripts/migrations/20251224_backfill_new_field.ts
   ```

3. **Run in production** (Neon):
   - Option A: Execute via local script with production `DATABASE_URL`
   - Option B: Convert to SQL and run in Neon SQL Editor

4. **Verify results**:
   ```sql
   -- Check row counts before/after
   SELECT COUNT(*) FROM table_name WHERE new_field IS NULL;
   SELECT COUNT(*) FROM table_name WHERE new_field IS NOT NULL;
   ```

---

## Migration Verification Checklist

After applying any migration:

- [ ] **Check for errors**: Review Neon SQL Editor output or script logs
- [ ] **Verify schema changes**: Inspect table structure in Neon dashboard
- [ ] **Test application**: Run `npm run build` locally to ensure code compatibility
- [ ] **Check data integrity**: Query affected tables to verify expected state
- [ ] **Update documentation**: Add migration note to PROJECT_SSOT.md with commit hash

---

## Rollback Procedures

### Schema Rollback (Manual)

**Important**: PostgreSQL schema migrations are **not automatically reversible**.

**Procedure**:

1. **Create rollback migration** before applying forward migration:
   ```sql
   -- migrations/005_add_new_feature_ROLLBACK.sql

   -- Rollback for 005_add_new_feature.sql
   -- Date: YYYY-MM-DD

   DROP INDEX IF EXISTS idx_listings_new_field;
   ALTER TABLE listings DROP COLUMN IF EXISTS new_field;
   ```

2. **Apply rollback migration** in Neon SQL Editor if needed

3. **Verify rollback**:
   ```sql
   \d listings  -- Verify column removed
   ```

### Data Rollback (Backup/Restore)

**For destructive data migrations**:

1. **Take snapshot before migration**:
   ```sql
   -- Create backup table
   CREATE TABLE listings_backup_20251224 AS
   SELECT * FROM listings;
   ```

2. **Apply migration**

3. **If rollback needed**:
   ```sql
   -- Restore from backup
   TRUNCATE listings;
   INSERT INTO listings SELECT * FROM listings_backup_20251224;

   -- Verify
   SELECT COUNT(*) FROM listings;

   -- Clean up backup
   DROP TABLE listings_backup_20251224;
   ```

### Neon Point-in-Time Recovery (Last Resort)

**When to use**: Critical data loss or corruption

**Procedure**:

1. Open Neon project dashboard
2. Navigate to "Backups" section
3. Select restore point (before migration)
4. Follow Neon's recovery workflow
5. Re-apply safe migrations after restore

**Warning**: Point-in-time recovery restores entire database to previous state. All changes after restore point will be lost.

---

## Migration Best Practices

### Writing Safe Migrations

1. **Idempotent operations**:
   ```sql
   -- Good: Safe to run multiple times
   CREATE TABLE IF NOT EXISTS new_table (...);
   ALTER TABLE listings ADD COLUMN IF NOT EXISTS new_field TEXT;

   -- Avoid: Fails on second run
   CREATE TABLE new_table (...);
   ALTER TABLE listings ADD COLUMN new_field TEXT;
   ```

2. **Non-destructive first**:
   - Add columns as nullable first
   - Backfill data
   - Add constraints after data is populated

3. **Avoid during peak hours**:
   - Apply large migrations during low-traffic periods
   - Consider impact on query performance

4. **Test migrations locally** (when possible):
   - Use local PostgreSQL instance matching Neon version
   - Verify migration syntax and logic before production

### Migration Naming Conventions

**Schema migrations** (in `migrations/`):
- Format: `NNN_description.sql`
- Example: `005_add_market_partition.sql`
- Sequential numbering for order clarity

**Data migrations** (in `scripts/migrations/`):
- Format: `YYYYMMDD_description.sql` or `YYYYMMDD_description.ts`
- Example: `20251224_backfill_card_language.sql`
- Timestamp prevents conflicts

---

## Common Migration Patterns

### Adding a Column

```sql
-- Safe: Nullable column, no default
ALTER TABLE listings ADD COLUMN IF NOT EXISTS new_field TEXT;

-- With default value
ALTER TABLE listings ADD COLUMN IF NOT EXISTS new_field TEXT DEFAULT 'default_value';

-- Then backfill if needed
UPDATE listings SET new_field = 'calculated_value' WHERE new_field IS NULL;
```

### Adding an Index

```sql
-- Safe: Concurrent index creation (doesn't block writes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_new_field
ON listings(new_field);
```

### Renaming a Column (Risky)

```sql
-- Option 1: Rename (application must be updated simultaneously)
ALTER TABLE listings RENAME COLUMN old_name TO new_name;

-- Option 2: Add new column, backfill, drop old (safer)
ALTER TABLE listings ADD COLUMN new_name TEXT;
UPDATE listings SET new_name = old_name;
ALTER TABLE listings DROP COLUMN old_name;
```

### Dropping a Column (Destructive)

```sql
-- Always use IF EXISTS for safety
ALTER TABLE listings DROP COLUMN IF EXISTS obsolete_field;

-- Consider: Keep column but stop using it in code first
-- Then drop in later migration after confirming no issues
```

---

## Troubleshooting

### Migration fails with syntax error

- Check PostgreSQL version compatibility (Neon uses PostgreSQL 16+)
- Verify SQL syntax in online validator
- Test migration on local PostgreSQL instance first

### Migration applied but application errors

- Verify `lib/schema.ts` or TypeScript types match new schema
- Check query code for references to old column names
- Run `npm run build` to catch TypeScript errors

### Accidental duplicate migration

- Check `scripts/migrations/archive/` for superseded versions
- Document which version is canonical in migration file comments
- Update PROJECT_SSOT.md to clarify (see commit 5d991a2 example)

---

**Governance**: This runbook is maintained as part of the Repo Hardening Pack (2025-12-24).

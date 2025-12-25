/**
 * Generic migration runner - applies a SQL migration file to the database.
 *
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 * Example: npx tsx scripts/run-migration.ts migrations/005_add_subscription_last_emailed.sql
 *
 * Requirements:
 * - DATABASE_URL environment variable must be set
 * - Migration file must exist and contain valid SQL
 *
 * Note: Migrations should be idempotent (use IF NOT EXISTS, etc.)
 */

import { query } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

async function runMigration(migrationFile: string): Promise<void> {
  // Resolve path relative to project root
  const absolutePath = path.resolve(process.cwd(), migrationFile);

  // Verify file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`ERROR: Migration file not found: ${absolutePath}`);
    process.exit(1);
  }

  // Read SQL content
  const sql = fs.readFileSync(absolutePath, "utf8").trim();

  if (!sql) {
    console.error("ERROR: Migration file is empty");
    process.exit(1);
  }

  const fileName = path.basename(migrationFile);
  console.log(`Running migration: ${fileName}`);
  console.log(`File path: ${absolutePath}`);
  console.log("---");

  try {
    await query(sql);
    console.log(`✅ Migration completed successfully: ${fileName}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${fileName}`);
    console.error(error);
    process.exit(1);
  }
}

// Main entry point
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: npx tsx scripts/run-migration.ts <migration-file>");
  console.error(
    "Example: npx tsx scripts/run-migration.ts migrations/005_add_subscription_last_emailed.sql"
  );
  process.exit(1);
}

const migrationFile = args[0];

runMigration(migrationFile).then(() => process.exit(0));

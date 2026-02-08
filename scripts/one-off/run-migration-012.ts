import { query } from "../lib/db";

async function runMigration() {
  console.log("Running migration: Create listing_overrides table...");

  try {
    // Create enum
    await query(`
      DO $$ BEGIN
        CREATE TYPE override_type AS ENUM ('ALLOW', 'HARD_BLOCK', 'SOFT_EXCLUDE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✓ Created override_type enum");

    // Create table
    await query(`
      CREATE TABLE IF NOT EXISTS listing_overrides (
        listing_id TEXT PRIMARY KEY,
        override_type override_type NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT DEFAULT 'debug',
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("✓ Created listing_overrides table");

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_listing_overrides_override_type 
      ON listing_overrides(override_type);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_listing_overrides_created_at 
      ON listing_overrides(created_at DESC);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_listing_overrides_expires_at 
      ON listing_overrides(expires_at) WHERE expires_at IS NOT NULL;
    `);
    console.log("✓ Created indexes");

    console.log("\n✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();

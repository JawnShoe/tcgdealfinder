/**
 * Show redacted DB connection info (host + database name only)
 */
import { query } from "../lib/db";

async function showDbInfo() {
  console.log("=== DATABASE CONNECTION INFO (REDACTED) ===\n");

  // Get the connection string from env
  const dbUrl = process.env.DATABASE_URL || "";

  // Parse to extract host and dbname only
  try {
    // Format: postgresql://user:pass@host/dbname?params
    const url = new URL(dbUrl);
    const host = url.hostname;
    const pathname = url.pathname.replace(/^\//, ""); // Remove leading slash

    console.log(`Host: ${host}`);
    console.log(`Database: ${pathname.split("?")[0]}`); // Remove query params
    console.log("");

    // Verify connection works
    const result = await query(
      "SELECT current_database() as db, current_user as user",
      []
    );
    console.log("✓ Connection verified");
    console.log(`  Current DB: ${result.rows[0].db}`);
    console.log(`  User: ${result.rows[0].user}`);
  } catch (error: any) {
    console.error("Error parsing DATABASE_URL:", error.message);
  }
}

showDbInfo()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });

import dotenv from "dotenv";
import pg from "pg";
import type { Pool, QueryResultRow } from "pg";

// Load environment variables for scripts (db:init, db:seed)
// This will read .env.local when running via tsx / Node.
dotenv.config({ path: ".env.local" });

declare global {
  var pgPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Check your environment configuration."
    );
  }

  if (global.pgPool) {
    return global.pgPool;
  }

  const pool = new pg.Pool({ connectionString });

  if (process.env.NODE_ENV !== "production") {
    global.pgPool = pool;
  }

  return pool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
) {
  return getPool().query<T>(text, params);
}

import dotenv from "dotenv";
import { Pool, QueryResultRow } from "pg";

// Load environment variables for scripts (db:init, db:seed)
// This will read .env.local when running via tsx / Node.
dotenv.config({ path: ".env.local" });

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your environment configuration.");
}

const pool = global.pgPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
) {
  return pool.query<T>(text, params);
}

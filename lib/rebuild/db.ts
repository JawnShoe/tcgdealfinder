import dotenv from "dotenv";
import { Pool, QueryResultRow } from "pg";

dotenv.config({ path: ".env.local" });

declare global {
  var rebuildPgPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set for rebuild DB access.");
  }

  if (global.rebuildPgPool) {
    return global.rebuildPgPool;
  }

  const pool = new Pool({ connectionString });

  if (process.env.NODE_ENV !== "production") {
    global.rebuildPgPool = pool;
  }

  return pool;
}

export function queryRebuild<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
) {
  return getPool().query<T>(text, params);
}

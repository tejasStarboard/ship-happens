import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, type PoolConfig } from "pg"
import * as schema from "./schema"

export type DbSchema = typeof schema

/**
 * Create a Drizzle client + pg Pool for any runtime (Next, worker, CLI).
 * Caller owns lifecycle (`pool.end()` on shutdown).
 */
export function createDb(
  connectionString: string,
  poolConfig?: Omit<PoolConfig, "connectionString">
) {
  if (!connectionString) {
    throw new Error("POSTGRES_URL / connectionString is required")
  }
  const pool = new Pool({ connectionString, ...poolConfig })
  const db = drizzle(pool, { schema })
  return { db, pool, schema }
}

export type Database = ReturnType<typeof createDb>["db"]

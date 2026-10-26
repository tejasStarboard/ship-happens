import { env } from "@/env"
import { createDb } from "@ship-happens/db"
import { Redis } from "ioredis"

const databaseUrl = env.POSTGRES_URL
if (!databaseUrl) {
  throw new Error("POSTGRES_URL is not set")
}

const { db: database, pool } = createDb(databaseUrl)

/** App-scoped Drizzle client (Postgres). Schema lives in `@ship-happens/db`. */
export const db = database
export { pool }

const redisUrl = env.REDIS_URL
if (!redisUrl) {
  throw new Error("REDIS_URL is not set")
}

/** Redis — web/auth runtime only (not part of `@ship-happens/db`). */
export const redis = new Redis(redisUrl)

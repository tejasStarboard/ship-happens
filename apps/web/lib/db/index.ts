import { env } from "@/env"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { Redis } from "ioredis"
import * as schema from "./schema"

const databaseUrl = env.POSTGRES_URL
if (!databaseUrl) {
  throw new Error("POSTGRES_URL is not set")
}

const pool = new Pool({ connectionString: databaseUrl })

export const db = drizzle(pool, { schema })

const redisUrl = env.REDIS_URL
if (!redisUrl) {
  throw new Error("REDIS_URL is not set")
}

export const redis = new Redis(redisUrl)

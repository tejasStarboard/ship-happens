import { config } from "dotenv"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { createEnv } from "@t3-oss/env-core"
import z from "zod"
import { isProduction } from "./lib/constants"

const envPaths = [
  resolve(import.meta.dirname, "../../../.env"),
  resolve(import.meta.dirname, "../.env"),
].filter((path) => existsSync(path))

if (envPaths.length > 0) {
  config({ path: envPaths })
}

export const env = createEnv({
  server: {
    POSTGRES_URL: z.url(),
    POSTGRES_SSL: z
      .enum(["true", "false"])
      .default(isProduction ? "true" : "false")
      .transform((v) => v === "true"),
    POSTGRES_MAX_CONNECTIONS: z.coerce.number().default(50),
    POSTGRES_CONNECTION_TIMEOUT: z.coerce.number().default(15000),
    POSTGRES_IDLE_TIMEOUT: z.coerce.number().default(30000),

    REDIS_URL: z.url(),

    RESEND_API_KEY: z.string().default("re_local_dev_placeholder"),
    EMAIL_SENDER_NAME: z.string().default("Ship Happens"),
    EMAIL_SENDER_ADDRESS: z.email().default("noreply@example.com"),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_DOMAIN: z.string().min(1).default("localhost"),
    GOOGLE_CLIENT_ID: z.string().optional().default(""),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

    APP_URL: z.url(),
    BLOB_STORE_ID: z.string().default("local"),
    BLOB_READ_WRITE_TOKEN: z.string().default("vercel_blob_local_placeholder"),
    VERCEL_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },
  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.string().describe("The URL of the app"),
  },
  runtimeEnv: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_SSL: process.env.POSTGRES_SSL,
    POSTGRES_MAX_CONNECTIONS: process.env.POSTGRES_MAX_CONNECTIONS,
    POSTGRES_CONNECTION_TIMEOUT: process.env.POSTGRES_CONNECTION_TIMEOUT,
    POSTGRES_IDLE_TIMEOUT: process.env.POSTGRES_IDLE_TIMEOUT,

    REDIS_URL: process.env.REDIS_URL,

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME,
    EMAIL_SENDER_ADDRESS: process.env.EMAIL_SENDER_ADDRESS,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_DOMAIN: process.env.BETTER_AUTH_DOMAIN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    APP_URL: process.env.APP_URL,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,

    VITE_APP_URL: process.env.VITE_APP_URL,
  },
  emptyStringAsUndefined: true,
})

import { config } from "dotenv"
import { resolve } from "node:path"
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"
import { isProduction } from "@/lib/constants"

// Root monorepo secrets first, then app-local overrides. dotenv no-ops if missing.
config({ path: resolve(process.cwd(), "../../.env") })
config({ path: resolve(process.cwd(), "../../.env.local") })
config({ path: resolve(process.cwd(), ".env"), override: true })
config({ path: resolve(process.cwd(), ".env.local"), override: true })

export const env = createEnv({
  server: {
    POSTGRES_URL: z.url(),
    POSTGRES_SSL: z
      .enum(["true", "false"])
      .default(isProduction ? "true" : "false")
      .transform((v) => v === "true"),
    REDIS_URL: z.url(),

    RESEND_API_KEY: z.string().default("re_local_dev_placeholder"),
    EMAIL_SENDER_NAME: z.string().default("Ship Happens"),
    EMAIL_SENDER_ADDRESS: z.string().default("noreply@localhost"),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_DOMAIN: z.string().min(1).default("localhost"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    APP_URL: z.url(),
    BLOB_STORE_ID: z.string().default("local"),
    BLOB_READ_WRITE_TOKEN: z.string().default("vercel_blob_local_placeholder"),
    VERCEL_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

    AI_GATEWAY_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),

    /** Starboard webapp base URL for `@starboard/sb-client` (no trailing slash). */
    STARBOARD_APP_DOMAIN: z.url().optional(),
    /** Handshake key for Starboard BFF (`x-starboard-handshake-key`). Never log. */
    STARBOARD_HANDSHAKE_KEY: z.string().min(1).optional(),
    /** Public API client id (Starboard admin → company → Public API keys). */
    SB_CLIENT_CLIENT_ID: z.string().min(1).optional(),
    /** Public API client secret. Never log. */
    SB_CLIENT_CLIENT_SECRET: z.string().min(1).optional(),
    /** Dev-only: skip public_api_clients verify and scope directly to this company. */
    SB_CLIENT_COMPANY_ID: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_SSL: process.env.POSTGRES_SSL,
    REDIS_URL: process.env.REDIS_URL,

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME,
    EMAIL_SENDER_ADDRESS: process.env.EMAIL_SENDER_ADDRESS,

    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_DOMAIN: process.env.BETTER_AUTH_DOMAIN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,

    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

    STARBOARD_APP_DOMAIN: process.env.STARBOARD_APP_DOMAIN,
    STARBOARD_HANDSHAKE_KEY: process.env.STARBOARD_HANDSHAKE_KEY,
    SB_CLIENT_CLIENT_ID: process.env.SB_CLIENT_CLIENT_ID,
    SB_CLIENT_CLIENT_SECRET: process.env.SB_CLIENT_CLIENT_SECRET,
    SB_CLIENT_COMPANY_ID: process.env.SB_CLIENT_COMPANY_ID,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL,
  },
  emptyStringAsUndefined: true,
})

import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"
import { resolve } from "node:path"

config({ path: resolve(process.cwd(), ".env") })

export default defineConfig({
  schema: ["./apps/web/src/db/schema/index.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
})

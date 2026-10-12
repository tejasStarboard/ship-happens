import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, "e2e/.auth/user.json")

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
const isCI = !!process.env.CI

export default defineConfig({
  testDir: "./e2e",
  // Shared Better Auth session (storageState) is not safe across parallel workers
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Video is expensive; keep only in CI failures
    video: isCI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "guest",
      testMatch: /(?:auth|onboarding)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /(?:navigation|settings|rfp|rates|templates)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
    },
  ],
  webServer: {
    // Local: reuse `pnpm --filter web dev` if already on :3000 (much faster).
    // CI: production server avoids Next compile-on-demand stalls.
    command: isCI ? "pnpm build && pnpm start" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 300_000 : 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})

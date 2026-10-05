import { test as setup, expect } from "@playwright/test"
import { mkdirSync } from "node:fs"
import {
  AUTH_DIR,
  AUTH_FILE,
  createOrganization,
  persistCredentials,
  signUp,
  uniqueCredentials,
} from "./helpers"

setup("authenticate seeded user", async ({ page }) => {
  const credentials = uniqueCredentials("seed")
  await signUp(page, credentials)
  await createOrganization(page, credentials)
  await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()

  mkdirSync(AUTH_DIR, { recursive: true })
  persistCredentials(credentials)
  await page.context().storageState({ path: AUTH_FILE })
})

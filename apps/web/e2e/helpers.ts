import { expect, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const AUTH_DIR = path.join(__dirname, ".auth")
export const AUTH_FILE = path.join(AUTH_DIR, "user.json")
export const AUTH_CREDENTIALS_FILE = path.join(AUTH_DIR, "credentials.json")

export type E2ECredentials = {
  name: string
  email: string
  password: string
  orgName: string
  orgSlug: string
}

export function uniqueCredentials(prefix = "e2e"): E2ECredentials {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    name: `E2E ${prefix}`,
    email: `${prefix}-${stamp}@example.com`,
    password: "TestPassword123!",
    orgName: `${prefix} Org ${stamp}`,
    orgSlug: `${prefix}-org-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  }
}

export function persistCredentials(credentials: E2ECredentials) {
  mkdirSync(AUTH_DIR, { recursive: true })
  writeFileSync(AUTH_CREDENTIALS_FILE, JSON.stringify(credentials, null, 2))
}

/** Wait until client React has hydrated so form handlers are attached. */
export async function waitForAppReady(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true"
  )
}

export async function signUp(page: Page, credentials: E2ECredentials) {
  await page.goto("/sign-up")
  await waitForAppReady(page)
  await expect(page.getByText("Create your account")).toBeVisible()

  const form = page.locator("#sign-up-form")
  await form.getByLabel("Name").fill(credentials.name)
  await form.getByLabel("Email address").fill(credentials.email)
  await form.getByLabel("Password", { exact: true }).fill(credentials.password)
  await form.getByLabel("Confirm password").fill(credentials.password)

  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page).toHaveURL(/\/select-org/)
}

export async function signIn(page: Page, credentials: E2ECredentials) {
  await page.goto("/sign-in")
  await waitForAppReady(page)
  await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible()

  const form = page.locator("#sign-in-form")
  await form.getByLabel("Email address").fill(credentials.email)
  await form.getByLabel("Password", { exact: true }).fill(credentials.password)

  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page).toHaveURL(/\/(select-org|rfp)/)
}

export async function createOrganization(
  page: Page,
  credentials: E2ECredentials
) {
  await waitForAppReady(page)
  const form = page.locator("#create-org-form")
  await expect(form).toBeVisible()
  await form.getByLabel("Name").fill(credentials.orgName)
  // Slug auto-fills from name; overwrite for uniqueness if needed
  await form.getByLabel("Slug URL").fill(credentials.orgSlug)

  await page.getByRole("button", { name: "Create Organization" }).click()
  await expect(page).toHaveURL(/\/rfp/)
  await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()
}

export async function selectOrganization(page: Page, orgName: string) {
  await waitForAppReady(page)
  await expect(page.getByText("Choose an organization")).toBeVisible()

  const orgButton = page.getByRole("button", { name: orgName })

  // Retry once: Vite dep-opt reloads (dev) can abort the first click/handler.
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(orgButton).toBeEnabled()
    await waitForAppReady(page)

    try {
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            /\/organization\/set-active(?:\?|$)/.test(
              new URL(res.url()).pathname
            ),
          { timeout: 30_000 }
        ),
        orgButton.click(),
      ])

      if (!response.ok()) {
        throw new Error(
          `organization set-active failed: ${response.status()} ${await response.text()}`
        )
      }

      await expect(page).toHaveURL(/\/rfp/, { timeout: 30_000 })
      return
    } catch (error) {
      if (attempt === 1 || !page.url().includes("/select-org")) {
        throw error
      }
      // Full reload recovers from aborted Vite module graph updates
      await page.reload()
      await waitForAppReady(page)
      await expect(page.getByText("Choose an organization")).toBeVisible()
    }
  }
}

export async function openUserMenu(page: Page) {
  // Footer user trigger shows the account name
  await page
    .locator("[data-sidebar='footer']")
    .getByRole("button")
    .first()
    .click()
}

export async function signOut(page: Page) {
  await openUserMenu(page)
  await page.getByRole("menuitem", { name: "Log out" }).click()
  await expect(page).toHaveURL(/\/sign-in/)
}

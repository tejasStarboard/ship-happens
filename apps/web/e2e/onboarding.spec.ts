import { test, expect } from "./fixtures"
import {
  createOrganization,
  selectOrganization,
  signIn,
  signOut,
  signUp,
  uniqueCredentials,
  waitForAppReady,
} from "./helpers"

test.describe("auth onboarding", () => {
  test("sign up, create org, land on RFPs", async ({ page }) => {
    const credentials = uniqueCredentials("signup")
    await signUp(page, credentials)
    await createOrganization(page, credentials)
    await expect(page).toHaveURL(/\/rfp/)
    await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()
    await expect(page.getByText("Nordstrom FCL Q2")).toBeVisible()
  })

  test("sign in existing user, pick org, then log out", async ({ page }) => {
    const credentials = uniqueCredentials("signin")
    await signUp(page, credentials)
    await createOrganization(page, credentials)

    await signOut(page)
    await expect(page).toHaveURL(/\/sign-in/)

    await signIn(page, credentials)
    await waitForAppReady(page)
    // Default post-auth path is /select-org even when orgs exist
    if (new URL(page.url()).pathname.includes("select-org")) {
      await selectOrganization(page, credentials.orgName)
    }
    await expect(page).toHaveURL(/\/rfp/)
    await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()

    await signOut(page)
    await page.goto("/rfp")
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

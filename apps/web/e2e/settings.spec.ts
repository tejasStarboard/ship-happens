import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("settings", () => {
  test("preferences persist theme selection", async ({ page }) => {
    await page.goto("/settings/preferences")
    await waitForAppReady(page)
    await expect(page.getByText("Interface theme")).toBeVisible()

    const themeTrigger = page.getByRole("combobox").filter({
      hasText: /System preference|Light|Dark/,
    })

    await expect(themeTrigger).toBeEnabled({ timeout: 15_000 })
    await themeTrigger.click()
    await page.getByRole("option", { name: "Dark" }).click()

    await page.reload()
    await waitForAppReady(page)
    await expect(
      page.getByRole("combobox").filter({ hasText: "Dark" })
    ).toBeVisible()
  })

  test("profile name updates and persists", async ({ page }) => {
    await page.goto("/settings/profile")
    await waitForAppReady(page)

    const nameInput = page.getByLabel("Full name")
    await expect(nameInput).toBeVisible()
    const nextName = `E2E Profile ${Date.now()}`
    await nameInput.fill(nextName)
    await nameInput.blur()

    await expect(page.getByText("Profile updated")).toBeVisible({
      timeout: 15_000,
    })

    await page.reload()
    await waitForAppReady(page)
    await expect(page.getByLabel("Full name")).toHaveValue(nextName)
  })

  test("members page lists members and opens invite dialog", async ({
    page,
  }) => {
    await page.goto("/settings/members")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()

    await page.getByRole("button", { name: /Invite/ }).click()
    await expect(page.getByText("Invite member").first()).toBeVisible()
    await expect(page.locator("#invite-user-form")).toBeVisible()
    await expect(
      page.locator("#invite-user-form").getByLabel("Email")
    ).toBeVisible()
  })
})

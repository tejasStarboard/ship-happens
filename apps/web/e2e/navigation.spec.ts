import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("authenticated navigation", () => {
  test("root redirects to Fills list", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/rfp/)
    await expect(page.getByRole("heading", { name: "Fills" })).toBeVisible()
    await expect(page.getByText(/No fills yet/)).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Status" })
    ).toBeVisible()
  })

  test("sidebar navigates between main sections", async ({ page }) => {
    await page.goto("/rfp")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Fills" })).toBeVisible()

    await page.getByRole("button", { name: "Templates" }).click()
    await expect(page).toHaveURL(/\/templates/)
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible()
    await expect(
      page.getByLabel("breadcrumb").getByText("Templates")
    ).toBeVisible()

    await page.getByRole("button", { name: "Overlays" }).click()
    await expect(page).toHaveURL(/\/overlays/)
    await expect(page.getByRole("heading", { name: "Overlays" })).toBeVisible()
    await expect(
      page.getByLabel("breadcrumb").getByText("Overlays")
    ).toBeVisible()

    await page.getByRole("button", { name: "Starboard rates" }).click()
    await expect(page).toHaveURL(/\/rates/)
    await expect(
      page.getByRole("heading", { name: "Starboard rates" })
    ).toBeVisible()
    await expect(
      page.getByLabel("breadcrumb").getByText("Starboard rates")
    ).toBeVisible()

    await page.getByRole("button", { name: "Get Help" }).click()
    await expect(page).toHaveURL(/\/help/)
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible()

    await page.getByRole("button", { name: "Settings" }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(
      page.getByLabel("breadcrumb").getByText("Settings")
    ).toBeVisible()
  })

  test("unknown fill and template ids show not found", async ({ page }) => {
    await page.goto("/rfp/not-a-real-id")
    await expect(page.getByText("Page not found")).toBeVisible()
    await expect(page.getByRole("button", { name: "Go home" })).toBeVisible()

    await page.goto("/templates/not-a-real-id")
    await expect(page.getByText("Page not found")).toBeVisible()
  })
})

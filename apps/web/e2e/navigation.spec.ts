import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("authenticated navigation", () => {
  test("root redirects to RFPs with mock table", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/rfp/)
    await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()
    await expect(page.getByText("Nordstrom FCL Q2")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible()
  })

  test("sidebar navigates between main sections", async ({ page }) => {
    await page.goto("/rfp")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()

    await page.getByRole("button", { name: "Templates" }).click()
    await expect(page).toHaveURL(/\/templates/)
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible()
    await expect(
      page.getByLabel("breadcrumb").getByText("Templates")
    ).toBeVisible()

    await page.getByRole("button", { name: "Rates" }).click()
    await expect(page).toHaveURL(/\/rates/)
    await expect(page.getByRole("heading", { name: "Rates" })).toBeVisible()
    await expect(page.getByLabel("breadcrumb").getByText("Rates")).toBeVisible()

    await page.getByRole("button", { name: "Settings" }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(
      page.getByLabel("breadcrumb").getByText("Settings")
    ).toBeVisible()
  })

  test("unknown RFP and template ids show not found", async ({ page }) => {
    await page.goto("/rfp/not-a-real-id")
    await expect(page.getByText("Page not found")).toBeVisible()
    await expect(page.getByRole("button", { name: "Go home" })).toBeVisible()

    await page.goto("/templates/not-a-real-id")
    await expect(page.getByText("Page not found")).toBeVisible()
  })
})

import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("Templates mock surface", () => {
  test("list opens detail with metadata and download", async ({ page }) => {
    await page.goto("/templates")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible()

    await page
      .getByRole("cell", { name: "Nordstrom bid sheet", exact: true })
      .click()
    await expect(page).toHaveURL(/\/templates\/tpl_nordstrom_v3/)
    await expect(
      page.getByRole("heading", { name: "Nordstrom bid sheet" })
    ).toBeVisible()

    await expect(page.getByText("Metadata")).toBeVisible()
    // Button+anchor composition exposes these as buttons
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Open in Office" })
    ).toBeVisible()
  })
})

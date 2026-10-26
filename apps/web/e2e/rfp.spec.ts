import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("Fills surface", () => {
  test("list shows empty state and opens New fill dialog", async ({ page }) => {
    await page.goto("/rfp")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Fill desk" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "New fill" }).first()
    ).toBeVisible()
    await expect(page.getByText(/Your fill desk is empty/)).toBeVisible()

    await page.getByRole("button", { name: "New fill" }).first().click()
    await expect(page.getByRole("heading", { name: "New fill" })).toBeVisible()
    await expect(page.getByLabel("Name")).toBeVisible()
    await expect(page.getByLabel("Workbook")).toBeVisible()
  })
})

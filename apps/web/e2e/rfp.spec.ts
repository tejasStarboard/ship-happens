import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("Fills surface", () => {
  test("list shows empty state and opens New fill dialog", async ({ page }) => {
    await page.goto("/rfp")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Fills" })).toBeVisible()
    await expect(page.getByRole("button", { name: "New fill" })).toBeVisible()
    await expect(page.getByText(/No fills yet/)).toBeVisible()

    await page.getByRole("button", { name: "New fill" }).click()
    await expect(page.getByRole("heading", { name: "New fill" })).toBeVisible()
    await expect(page.getByLabel("Name")).toBeVisible()
    await expect(page.getByLabel("Workbook")).toBeVisible()
  })
})

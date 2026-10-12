import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("Templates surface", () => {
  test("list shows empty state and opens Upload dialog", async ({ page }) => {
    await page.goto("/templates")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Upload" })).toBeVisible()
    await expect(page.getByText(/No templates/i)).toBeVisible()

    await page.getByRole("button", { name: "Upload" }).click()
    await expect(
      page.getByRole("heading", { name: "Upload template" })
    ).toBeVisible()
    await expect(page.getByLabel("Name")).toBeVisible()
    await expect(page.getByLabel("Workbook")).toBeVisible()
  })
})

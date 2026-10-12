import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("RFP surface", () => {
  test("list opens detail and switches tabs", async ({ page }) => {
    await page.goto("/rfp")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()

    await page.getByRole("row", { name: /Nordstrom FCL Q2/ }).click()
    // Demo RFPs are seeded as `{mockId}__{organizationId}`
    await expect(page).toHaveURL(/\/rfp\/rfp_nordstrom_q2__/)
    await expect(
      page.getByRole("heading", { name: "Nordstrom FCL Q2" })
    ).toBeVisible()

    // Leave Agent immediately — default tab boots the eve workspace and is slow in e2e.
    await page.getByRole("tab", { name: "Logs" }).click()
    await expect(page.getByText("Run logs")).toBeVisible()
    await expect(page.getByText(/parse-workbook/)).toBeVisible()

    await page.getByRole("tab", { name: "Progress" }).click()
    await expect(page.getByText("Upload received")).toBeVisible()

    await page.getByRole("tab", { name: "Fill report" }).click()
    await expect(page.getByText("Fill report").first()).toBeVisible()
  })
})

import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("RFP mock surface", () => {
  test("list opens detail and switches tabs", async ({ page }) => {
    await page.goto("/rfp")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "RFPs" })).toBeVisible()

    await page.getByRole("row", { name: /Nordstrom FCL Q2/ }).click()
    await expect(page).toHaveURL(/\/rfp\/rfp_nordstrom_q2/)
    await expect(
      page.getByRole("heading", { name: "Nordstrom FCL Q2" })
    ).toBeVisible()

    await page.getByRole("tab", { name: "Logs" }).click()
    await expect(page.getByText("Run logs")).toBeVisible()
    await expect(page.getByText(/parse-workbook/)).toBeVisible()

    await page.getByRole("tab", { name: "Progress" }).click()
    await expect(page.getByText("Upload received")).toBeVisible()

    await page.getByRole("tab", { name: "Fill report" }).click()
    await expect(page.getByText("Fill report").first()).toBeVisible()

    await page.getByRole("tab", { name: "Agent" }).click()
    await expect(page.getByRole("tab", { name: "Agent" })).toBeVisible()
  })
})

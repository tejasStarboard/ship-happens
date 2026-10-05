import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

test.describe("Rates mock surface", () => {
  test("empty hint then search shows mock results", async ({ page }) => {
    await page.goto("/rates")
    await waitForAppReady(page)
    await expect(page.getByRole("heading", { name: "Rates" })).toBeVisible()
    await expect(
      page.getByText("Run a search to see mock rate rows.")
    ).toBeVisible()

    await page.getByLabel("Origin").fill("CNSHA")
    await page.getByLabel("Destination").fill("USLAX")
    await page.getByLabel("Container").fill("40HC")
    await page.getByRole("button", { name: "Search rates" }).click()

    await expect(page.getByText("OOCL")).toBeVisible()
    await expect(page.getByText("MSC")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Carrier" })).toBeVisible()
  })
})

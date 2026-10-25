import { test, expect } from "./fixtures"
import { waitForAppReady } from "./helpers"

const emptySurcharges = [] as const

const okSearchBody = {
  status: "ok" as const,
  companyId: "co_e2e",
  lane: {
    origin: "CNSHA",
    destination: "USLAX",
    equipment: "40HC",
    spotCarrier: "cma",
    serviceType: "ocean_fcl" as const,
  },
  rows: [
    {
      id: "contract:1",
      origin: "CNSHA",
      destination: "USLAX",
      originName: "Shanghai",
      destinationName: "Los Angeles",
      originVia: null,
      destinationVia: null,
      route: null,
      carrier: "OOCL",
      vendorName: "Demo Vendor",
      containerType: "40HC",
      channel: "contract" as const,
      baseAmount: 1600,
      amount: 1850,
      currency: "USD",
      validFrom: "2026-10-01",
      validTo: "2026-10-31",
      transitMinDays: 14,
      transitMaxDays: 18,
      serviceName: "AAX",
      vesselName: null,
      sailingDate: null,
      productType: null,
      surcharges: [
        {
          name: "ocean_freight",
          amount: 1600,
          unitRate: 1600,
          currency: "USD",
          usageUnit: "EQ",
          leg: "main",
          includedInTotal: true,
          note: null,
        },
        {
          name: "BAF",
          amount: 250,
          unitRate: 250,
          currency: "USD",
          usageUnit: "EQ",
          leg: "main",
          includedInTotal: true,
          note: null,
        },
      ],
    },
    {
      id: "spot:1",
      origin: "CNSHA",
      destination: "USLAX",
      originName: null,
      destinationName: null,
      originVia: null,
      destinationVia: null,
      route: "CNSHA → KRPUS → USLAX",
      carrier: "CMA CGM",
      vendorName: null,
      containerType: "40HC",
      channel: "spot" as const,
      baseAmount: 1700,
      amount: 1925,
      currency: "USD",
      validFrom: "2026-10-01",
      validTo: "2026-10-15",
      transitMinDays: 16,
      transitMaxDays: 16,
      serviceName: null,
      vesselName: "CMA CGM LOIRE",
      sailingDate: "2026-10-12",
      productType: "SPOT",
      surcharges: emptySurcharges,
    },
  ],
  contract: { status: "ok" as const, count: 1 },
  spot: { status: "ok" as const, count: 1 },
}

test.describe("Rates live search surface", () => {
  test("idle hint then search shows mapped live rows", async ({ page }) => {
    await page.route("**/api/starboard/rates/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(okSearchBody),
      })
    })

    await page.goto("/rates")
    await waitForAppReady(page)
    await expect(
      page.getByRole("heading", { name: "Starboard rates" })
    ).toBeVisible()
    await expect(
      page.getByText("Run a search to load live Starboard rates.")
    ).toBeVisible()

    await page.getByLabel("Origin").fill("CNSHA")
    await page.getByLabel("Destination").fill("USLAX")
    await page.getByLabel("Container").fill("40HC")
    await page.getByLabel("Carrier (spot, optional)").fill("cma")
    await page.getByRole("button", { name: "Search rates" }).click()

    await expect(page.getByText("OOCL")).toBeVisible()
    await expect(page.getByText("CMA CGM")).toBeVisible()
    await expect(page.getByText("Contract")).toBeVisible()
    await expect(page.getByText("Spot")).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Channel" })
    ).toBeVisible()
    await expect(page.getByText("2026-10-31")).toBeVisible()

    await page
      .getByRole("button", { name: "Show surcharges and rate details" })
      .first()
      .click()
    await expect(page.getByText("BAF")).toBeVisible()
    await expect(page.getByText("Surcharges (2)")).toBeVisible()
  })

  test("empty search shows honest empty state", async ({ page }) => {
    await page.route("**/api/starboard/rates/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "empty",
          companyId: "co_e2e",
          lane: okSearchBody.lane,
          rows: [],
          contract: { status: "empty", count: 0 },
          spot: { status: "empty", count: 0 },
        }),
      })
    })

    await page.goto("/rates")
    await waitForAppReady(page)
    await page.getByRole("button", { name: "Search rates" }).click()
    await expect(
      page.getByText("No contract or spot rates for CNSHA → USLAX (40HC).")
    ).toBeVisible()
  })

  test("error search shows honest error state", async ({ page }) => {
    await page.route("**/api/starboard/rates/search**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          kind: "config",
          message: "Starboard is not configured",
          rows: [],
        }),
      })
    })

    await page.goto("/rates")
    await waitForAppReady(page)
    await page.getByRole("button", { name: "Search rates" }).click()
    await expect(page.getByRole("alert")).toContainText("Rate search failed")
    await expect(page.getByRole("alert")).toContainText(
      "Starboard is not configured"
    )
    await expect(page.getByRole("alert")).toContainText("Kind: config")
  })
})

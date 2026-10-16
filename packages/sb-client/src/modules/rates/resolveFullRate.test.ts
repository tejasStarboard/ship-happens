import { describe, expect, it } from "vitest"
import { assembleResolvedRate } from "./resolveFullRate.js"
import { priceGlobalBuy } from "./priceGlobal.js"
import { globalMatchesLane } from "./matchGlobals.js"
import type { RateItemRow } from "../globals/filter.js"

describe("priceGlobalBuy (QGS parity)", () => {
  it("applies dollar minimum when usage_by=rate (Test Min 4313)", () => {
    const item: RateItemRow = {
      id: "min",
      name: "Test Min 4313",
      rate: 50,
      currency: "USD",
      usage_unit: "EQ",
      usage_by: "rate",
      min_usage: 100,
    }
    const priced = priceGlobalBuy(item, "40HC")
    expect(priced?.amount).toBe(100)
    expect(priced?.minimum_charge_applied).toBe(true)
    expect(priced?.qty).toBe(1)
  })

  it("bills TEU × 40HC = 2 (Test 4431)", () => {
    const item: RateItemRow = {
      id: "teu",
      name: "Test 4431",
      rate: 55,
      currency: "USD",
      usage_unit: "TEU",
      usage_by: "rate",
      min_usage: 100,
    }
    const priced = priceGlobalBuy(item, "40HC")
    expect(priced?.qty).toBe(2)
    expect(priced?.amount).toBe(110)
  })

  it("prices flat FILE at unit rate", () => {
    const item: RateItemRow = {
      id: "file",
      name: "Per File Test",
      rate: 15,
      currency: "USD",
      usage_unit: "FILE",
      usage_by: "quantity",
    }
    expect(priceGlobalBuy(item, "40HC")?.amount).toBe(15)
  })
})

describe("globalMatchesLane", () => {
  it("rejects when origin group does not contain lane origin", () => {
    const item: RateItemRow = {
      id: "g",
      name: "Orig-POL",
      origin_group_code_id: "gc-origin",
      pol_group_code_id: "gc-pol",
    }
    expect(
      globalMatchesLane(item, { origin: ["CNSHA"], destination: ["USNYC"] }, [
        { id: "gc-origin", unlocodes: ["CNYTN"], country_codes: [] },
        { id: "gc-pol", unlocodes: ["CNYTN"], country_codes: [] },
      ])
    ).toBe(false)
  })

  it("accepts unrestricted globals", () => {
    expect(
      globalMatchesLane(
        { id: "g", name: "Per File" },
        { origin: ["CNSHA"], destination: ["USNYC"] },
        []
      )
    ).toBe(true)
  })
})

describe("assembleResolvedRate", () => {
  it("matches quote 86R6B5 ONE buy total 3663", () => {
    const globals: RateItemRow[] = [
      {
        id: "file",
        name: "Per File Test",
        rate: 15,
        currency: "USD",
        usage_unit: "FILE",
        usage_by: "quantity",
      },
      {
        id: "min",
        name: "Test Min 4313",
        rate: 50,
        currency: "USD",
        usage_unit: "EQ",
        usage_by: "rate",
        min_usage: 100,
      },
      {
        id: "teu",
        name: "Test 4431",
        rate: 55,
        currency: "USD",
        usage_unit: "TEU",
        usage_by: "rate",
        min_usage: 100,
      },
    ]
    const resolved = assembleResolvedRate(
      {
        carrier_name: "ONE",
        total_amount: 3438,
        currency: "USD",
        rate: { container_type: "40HC" },
        surcharges: [
          { name: "ocean_freight", calculated_amount: 3438, currency: "USD" },
        ],
      },
      globals,
      "40HC"
    )
    expect(
      resolved.global_surcharges
        .map((g) => g.amount)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
    ).toEqual([15, 100, 110])
    expect(resolved.resolved_buy_total).toBe(3663)
  })
})

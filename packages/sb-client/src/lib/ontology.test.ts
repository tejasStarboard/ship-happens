import { describe, expect, it } from "vitest"
import { classifySurchargeName, rollupCharges } from "./chargeOntology.js"
import { splitVia, splitViaAlternates } from "./laneText.js"
import { recommendRate } from "./recommendRate.js"

describe("laneText", () => {
  it("splits chicago via la/lgb", () => {
    expect(splitVia("CHICAGO via LA/LGB")).toEqual({
      primary: "CHICAGO",
      via: "LA/LGB",
    })
    expect(splitViaAlternates("LA/LGB")).toEqual(["LA", "LGB"])
  })
})

describe("classifySurchargeName", () => {
  it("classifies ocean freight and BAF", () => {
    expect(classifySurchargeName("ocean_freight").bucket).toBe("base_freight")
    expect(classifySurchargeName("BAF").bucket).toBe("freight_surcharge")
    expect(classifySurchargeName("AMS Fee").bucket).toBe("documentation")
    expect(classifySurchargeName("Destination THC").bucket).toBe("destination")
  })
})

describe("rollupCharges", () => {
  it("clubs base + baf into headings", () => {
    const { headings } = rollupCharges({
      charges: [
        { name: "ocean_freight", amount: 2000, currency: "USD" },
        { name: "BAF", amount: 200, currency: "USD" },
        { name: "AMS", amount: 35, currency: "USD" },
      ],
      headings: ["base", "baf", "documentation", "total"],
    })
    const by = Object.fromEntries(headings.map((h) => [h.heading, h.amount]))
    expect(by.base).toBe(2000)
    expect(by.baf).toBe(200)
    expect(by.documentation).toBe(35)
    expect(by.total).toBe(2235)
  })
})

describe("recommendRate", () => {
  it("picks cheapest USD", () => {
    const pick = recommendRate([
      { carrier_name: "MSC", total_amount: 2400, currency: "USD" },
      {
        carrier_name: "Maersk",
        total_amount: 2200,
        currency: "USD",
        transit_time_days: { min: 14 },
      },
      { carrier_name: "HMM", total_amount: 2500, currency: "USD" },
    ])
    expect(pick?.rate.carrier_name).toBe("Maersk")
    expect(pick?.reason).toBe("cheapest")
  })
})

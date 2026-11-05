import { describe, expect, it } from "vitest"
import { normalizeForFill, pickForFill } from "./fillView.js"

/** Nordstrom-like SHA→SEA hit: ocean + LSS + free time in surcharges. */
const nordstromHit = {
  id: "sha-sea-1",
  carrier_name: "CMA CGM",
  origin: "CNSHA",
  destination: "USSEA",
  currency: "USD",
  total_amount: 2850,
  transit_time: 18,
  service_name: "EX1 Direct",
  effective_from: "2024-01-01",
  expires_on: "2024-12-31",
  surcharges: [
    { name: "ocean_freight", calculated_amount: 2200 },
    { name: "lss", calculated_amount: 450 },
    { name: "origin_free_time", free_usage: 7 },
    { name: "destination_free_time", free_usage: 5 },
  ],
}

/** Jakarta with destination arbitrary. */
const jakartaHit = {
  id: "jkt-1",
  carrier_name: "MSC",
  origin: "IDJKT",
  destination: "USLAX",
  currency: "USD",
  total_amount: 3100,
  surcharges: [
    { name: "ocean_freight", rate: { "40HC": 2500 } },
    { name: "baf", rate: { "40HC": 300 } },
    { name: "destination_arbitrary", rate: { "40HC": 300 } },
  ],
}

/** BOM with transit, no LSS present. */
const bomHit = {
  id: "bom-1",
  carrier_name: "Maersk",
  origin: "INNSA",
  destination: "USNYC",
  currency: "USD",
  total_amount: 4100,
  transit_time: 28,
  service_name: "ME1",
  surcharges: [{ name: "ocean_freight", calculated_amount: 4100 }],
}

describe("normalizeForFill", () => {
  it("peels base / lss / free_time / transit from Nordstrom-like hit", () => {
    const v = normalizeForFill(nordstromHit, "40HC")
    expect(v.base).toBe(2200)
    expect(v.lss).toBe(450)
    expect(v.arb).toBeNull()
    expect(v.all_in).toBe(2850)
    expect(v.carrier_name).toBe("CMA CGM")
    expect(v.transit_days).toBe(18)
    expect(v.service_name).toBe("EX1 Direct")
    expect(v.free_time?.originDays).toBe(7)
    expect(v.free_time?.destDays).toBe(5)
    expect(v.unsupported.schedule.supported).toBe(false)
    expect(v.unsupported.schedule.reason).toBe("contract_resolve")
  })

  it("reads arb + BAF-as-lss from Jakarta-like hit", () => {
    const v = normalizeForFill(jakartaHit, "40HC")
    expect(v.base).toBe(2500)
    expect(v.lss).toBe(300)
    expect(v.arb).toBe(300)
    expect(v.all_in).toBe(3100)
  })

  it("never invents LSS when absent (BOM)", () => {
    const v = normalizeForFill(bomHit, "40HC")
    expect(v.base).toBe(4100)
    expect(v.lss).toBeNull()
    expect(v.arb).toBeNull()
    expect(v.all_in).toBe(4100)
    expect(v.transit_days).toBe(28)
  })

  it("returns null money fields when hit has no amounts", () => {
    const v = normalizeForFill(
      { carrier_name: "ONE", surcharges: [] },
      "40HC"
    )
    expect(v.base).toBeNull()
    expect(v.lss).toBeNull()
    expect(v.all_in).toBeNull()
  })
})

describe("pickForFill", () => {
  it("picks cheapest above floor; prefers service_name near-cheapest", () => {
    const junk = {
      id: "junk",
      carrier_name: "Ghost",
      total_amount: 12,
      surcharges: [{ name: "ocean_freight", calculated_amount: 12 }],
    }
    const cheapNoSvc = {
      id: "cheap",
      carrier_name: "MSC",
      total_amount: 2000,
      surcharges: [{ name: "ocean_freight", calculated_amount: 2000 }],
    }
    const nearWithSvc = {
      id: "svc",
      carrier_name: "CMA CGM",
      total_amount: 2050,
      service_name: "EX1",
      surcharges: [{ name: "ocean_freight", calculated_amount: 2050 }],
    }
    const picked = pickForFill([junk, nearWithSvc, cheapNoSvc], "40HC")
    expect(picked?.view.source_rate_id).toBe("svc")
    expect(picked?.view.service_name).toBe("EX1")
  })

  it("falls back to absolute cheapest when all below floor", () => {
    const a = {
      id: "a",
      total_amount: 50,
      surcharges: [{ name: "ocean_freight", calculated_amount: 50 }],
    }
    const picked = pickForFill([a], "40HC")
    expect(picked?.view.all_in).toBe(50)
  })

  it("returns null when no priced hits", () => {
    expect(pickForFill([{ carrier_name: "X" }], "40HC")).toBeNull()
  })
})

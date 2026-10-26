import { describe, expect, it } from "vitest"
import {
  allocateLaneFees,
  normalizeFeeBindings,
  proposeFeeBindingsFromLabels,
} from "./fee-bindings"
import type { MappedLane } from "./mapped-lane"

const baseLane: MappedLane = {
  laneId: "lane_1",
  originLocode: "CNSHA",
  destLocode: "USLAX",
  equipmentType: "40HC",
  sheetName: "Rates",
  columnKey: "ocean_freight",
  cellRef: "D3",
  rowIndex: 2,
}

describe("normalizeFeeBindings", () => {
  it("merges legacy surchargeSlots and feeBindings", () => {
    const bindings = normalizeFeeBindings({
      ...baseLane,
      surchargeSlots: ["BAF", "AMS"],
      feeBindings: [{ heading: "THC", columnKey: "thc_col" }],
    })
    expect(bindings.map((b) => b.heading)).toEqual(["THC", "BAF", "AMS"])
  })
})

describe("proposeFeeBindingsFromLabels", () => {
  it("proposes codes and skips base freight", () => {
    const proposed = proposeFeeBindingsFromLabels([
      "Ocean Freight",
      "BAF",
      "Destination THC",
      "AMS Fee",
    ])
    expect(proposed.some((p) => /ocean|base/i.test(p.heading))).toBe(false)
    const headings = proposed.map((p) => p.heading.toLowerCase())
    expect(headings).toEqual(
      expect.arrayContaining(["baf", "destination_fees"])
    )
    expect(headings.some((h) => h.includes("ams"))).toBe(true)
  })
})

describe("allocateLaneFees", () => {
  it("writes fee cells from resolve surcharges and flags unexpected", () => {
    const allocation = allocateLaneFees({
      lane: {
        ...baseLane,
        feeBindings: [
          { heading: "BAF", columnKey: "baf_col", cellRef: "E3" },
          { heading: "AMS", columnKey: "ams_col" },
        ],
      },
      resolvedBuyTotal: 2280,
      resolvedCurrency: "USD",
      resolvedSurcharges: [
        { name: "ocean_freight", amount: 2000, currency: "USD" },
        { name: "BAF", amount: 200, currency: "USD", source: "carrier" },
        { name: "AMS", amount: 35, currency: "USD", source: "global" },
        {
          name: "Chassis",
          amount: 45,
          currency: "USD",
          source: "global",
        },
      ],
    })

    expect(allocation.feeCells).toHaveLength(2)
    expect(allocation.feeCells[0]?.amount).toBe(200)
    expect(allocation.feeCells[0]?.match).toBe("code")
    expect(allocation.feeCells[1]?.amount).toBe(35)
    expect(allocation.unexpected.map((u) => u.name)).toContain("Chassis")
    expect(allocation.baseAmount).toBe(2000)
  })

  it("keeps all-in buy when no fee bindings", () => {
    const allocation = allocateLaneFees({
      lane: baseLane,
      resolvedBuyTotal: 1500,
      resolvedCurrency: "USD",
      resolvedSurcharges: [{ name: "BAF", amount: 100, currency: "USD" }],
    })
    expect(allocation.feeCells).toHaveLength(0)
    expect(allocation.unexpected).toHaveLength(0)
    expect(allocation.baseAmount).toBe(1500)
  })
})

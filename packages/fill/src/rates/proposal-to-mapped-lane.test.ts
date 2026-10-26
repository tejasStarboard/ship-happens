import { describe, expect, it } from "vitest"
import {
  isLowConfidenceMapping,
  mappedLaneFromProposal,
} from "./proposal-to-mapped-lane"

describe("mappedLaneFromProposal", () => {
  it("builds a lane from aliases and defaults laneId", () => {
    const lane = mappedLaneFromProposal({
      origin: "CNSHA",
      dest: "USLAX",
      equipment: "40HC",
      sheet: "Rates",
      col: "ocean_freight",
      serviceType: "ocean_fcl",
    })
    expect(lane).toEqual({
      laneId: "lane_cnsha_uslax_40hc",
      originLocode: "CNSHA",
      destLocode: "USLAX",
      equipmentType: "40HC",
      sheetName: "Rates",
      columnKey: "ocean_freight",
      serviceType: "ocean_fcl",
    })
  })

  it("merges Edit resolution over proposal", () => {
    const lane = mappedLaneFromProposal(
      {
        laneId: "lane_1",
        originLocode: "CNSHA",
        destLocode: "USLAX",
        equipmentType: "40HC",
      },
      { equipmentType: "40GP", columnKey: "base" }
    )
    expect(lane?.equipmentType).toBe("40GP")
    expect(lane?.columnKey).toBe("base")
  })

  it("returns null when O-D-equipment incomplete", () => {
    expect(mappedLaneFromProposal({ col: "A", origin: "CNSHA" })).toBeNull()
  })
})

describe("isLowConfidenceMapping", () => {
  it("flags under 0.9", () => {
    expect(isLowConfidenceMapping(0.4)).toBe(true)
    expect(isLowConfidenceMapping("0.89")).toBe(true)
    expect(isLowConfidenceMapping(0.9)).toBe(false)
    expect(isLowConfidenceMapping(null)).toBe(false)
  })
})

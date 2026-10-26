import { describe, expect, it } from "vitest"
import {
  mappedLaneToSearchInput,
  pickResolvedCandidate,
} from "./lane-to-search-input"
import type { MappedLane } from "./mapped-lane"

const lane: MappedLane = {
  laneId: "lane_1",
  originLocode: "cnsha",
  destLocode: "uslax",
  equipmentType: "40hc",
}

describe("mappedLaneToSearchInput", () => {
  it("uppercases locodes/equipment and defaults validity to today UTC", () => {
    const now = new Date("2026-03-15T12:00:00.000Z")
    expect(mappedLaneToSearchInput(lane, now)).toEqual({
      service_type: "ocean_fcl",
      origin_locodes: ["CNSHA"],
      destination_locodes: ["USLAX"],
      cargo: {
        cargo_type: "container",
        container_types: ["40HC"],
      },
      effective_from: "2026-03-15",
      expires_on: "2026-03-15",
    })
  })

  it("honors explicit validity and service type", () => {
    const input = mappedLaneToSearchInput({
      ...lane,
      serviceType: "ocean_lcl",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
    })
    expect(input.service_type).toBe("ocean_lcl")
    expect(input.effective_from).toBe("2026-01-01")
    expect(input.expires_on).toBe("2026-12-31")
  })
})

describe("pickResolvedCandidate", () => {
  it("returns null when empty or unpriced", () => {
    expect(pickResolvedCandidate([])).toBeNull()
    expect(pickResolvedCandidate([{ resolved_buy_total: null }])).toBeNull()
  })

  it("picks the cheapest priced hit", () => {
    const chosen = pickResolvedCandidate([
      { id: "a", resolved_buy_total: 1200 },
      { id: "b", resolved_buy_total: 900 },
      { id: "c", resolved_buy_total: null },
    ])
    expect(chosen?.id).toBe("b")
  })
})

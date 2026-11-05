import { describe, expect, it } from "vitest"
import {
  deriveAllInAmount,
  emitAnswerCells,
  normalizeAnswerBindings,
  resolveAnswerValue,
} from "./answer-bindings"
import type { MappedLane } from "./mapped-lane"
import type { ResolvedRateCandidate } from "./rate-ports"
import { allocateLaneFees } from "./fee-bindings"

const lane: MappedLane = {
  laneId: "lane_1",
  originLocode: "CNSHA",
  destLocode: "USLAX",
  equipmentType: "40HC",
  sheetName: "Lanes",
  cellRef: "K3",
  answerBindings: [
    { answerId: "carrier_name", cellRef: "A3" },
    { answerId: "transit_days", cellRef: "P3" },
    { answerId: "free_time.origin_days", cellRef: "U3" },
    { answerId: "all_in", cellRef: "L3" },
  ],
  feeBindings: [{ heading: "LSS", columnKey: "lss", cellRef: "M3" }],
}

const candidate: ResolvedRateCandidate = {
  id: "hit_1",
  carrier_name: "MSC",
  resolved_buy_total: 1700,
  resolved_currency: "USD",
  transit_time_days: 18,
  free_time: {
    originDays: 7,
    destDays: 5,
    detentionOrigin: null,
    detentionDest: null,
    demurrageOrigin: null,
    demurrageDest: null,
  },
  resolved_surcharges: [
    { name: "ocean_freight", amount: 1500, currency: "USD" },
    { name: "LSS", amount: 200, currency: "USD" },
  ],
}

describe("answer-bindings", () => {
  it("normalizes answerBindings on a mapped lane", () => {
    expect(normalizeAnswerBindings(lane)).toHaveLength(4)
  })

  it("resolves carrier / transit / free days from candidate", () => {
    expect(
      resolveAnswerValue({ answerId: "carrier_name", candidate }).value
    ).toBe("MSC")
    expect(
      resolveAnswerValue({ answerId: "transit_days", candidate }).value
    ).toBe("18")
    expect(
      resolveAnswerValue({
        answerId: "free_time.origin_days",
        candidate,
      }).value
    ).toBe("7")
  })

  it("skips missing facts without inventing", () => {
    const thin: ResolvedRateCandidate = {
      resolved_buy_total: 100,
      resolved_currency: "USD",
    }
    expect(
      resolveAnswerValue({ answerId: "transit_days", candidate: thin }).value
    ).toBeNull()
    expect(
      resolveAnswerValue({ answerId: "carrier_scac", candidate: thin }).reason
    ).toMatch(/SCAC/)
  })

  it("derives all_in as base + fee sum when fees peeled", () => {
    const allocation = allocateLaneFees({
      lane,
      resolvedBuyTotal: candidate.resolved_buy_total,
      resolvedCurrency: candidate.resolved_currency,
      resolvedSurcharges: candidate.resolved_surcharges ?? [],
    })
    expect(deriveAllInAmount(candidate, allocation)).toBe(1700)
    const emits = emitAnswerCells({ lane, candidate, allocation })
    const allIn = emits.find((e) => e.binding.answerId === "all_in")
    expect(allIn?.outcome).toBe("filled")
    expect(allIn?.value).toBe("1700")
    const lssFee = allocation.feeCells.find((f) => f.binding.heading === "LSS")
    expect(lssFee?.amount).toBe(200)
  })
})

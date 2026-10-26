import { describe, expect, it } from "vitest"
import {
  aggregateBidConversion,
  computeWinRate,
  emptyBidConversion,
} from "./ops-analytics-metrics"

describe("computeWinRate", () => {
  it("excludes closed/expired from denominator", () => {
    expect(computeWinRate(2, 2)).toBe(0.5)
    expect(computeWinRate(0, 0)).toBeNull()
  })
})

describe("aggregateBidConversion", () => {
  const now = new Date("2026-06-15T12:00:00.000Z")

  it("aggregates decided mix and overdue aging", () => {
    const view = aggregateBidConversion({
      decided: [
        { bidOutcome: "won" },
        { bidOutcome: "won" },
        { bidOutcome: "lost" },
        { bidOutcome: "closed" },
        { bidOutcome: "expired" },
      ],
      dueRows: [
        { dueAt: "2026-06-14T00:00:00.000Z", bidOutcome: null },
        { dueAt: "2026-06-01T00:00:00.000Z", bidOutcome: null },
        { dueAt: "2026-07-01T00:00:00.000Z", bidOutcome: null },
        { dueAt: "2026-01-01T00:00:00.000Z", bidOutcome: "won" },
      ],
      now,
    })

    expect(view.decidedCount).toBe(5)
    expect(view.won).toBe(2)
    expect(view.lost).toBe(1)
    expect(view.closed).toBe(1)
    expect(view.expired).toBe(1)
    expect(view.winRate).toBeCloseTo(2 / 3)
    expect(view.dueAging.withDue).toBe(3)
    expect(view.dueAging.overdue).toBe(2)
  })

  it("empty helper has zero counts", () => {
    const empty = emptyBidConversion()
    expect(empty.decidedCount).toBe(0)
    expect(empty.winRate).toBeNull()
    expect(empty.dueAging.overdue).toBe(0)
  })
})

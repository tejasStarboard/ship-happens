import { describe, expect, it } from "vitest"
import {
  isBidOverdue,
  isRfpBidOutcome,
  resolveEffectiveBidOutcome,
} from "./fill-bid-outcome"

describe("resolveEffectiveBidOutcome", () => {
  const now = new Date("2026-06-15T12:00:00.000Z")

  it("returns stored outcome", () => {
    expect(
      resolveEffectiveBidOutcome({
        bidOutcome: "won",
        dueAt: "2026-01-01T00:00:00.000Z",
        now,
      })
    ).toEqual({ outcome: "won", derived: false })
  })

  it("derives expired when past due and undecided", () => {
    expect(
      resolveEffectiveBidOutcome({
        bidOutcome: null,
        dueAt: "2026-06-01T00:00:00.000Z",
        now,
      })
    ).toEqual({ outcome: "expired", derived: true })
  })

  it("stays undecided when due is in the future", () => {
    expect(
      resolveEffectiveBidOutcome({
        bidOutcome: null,
        dueAt: "2026-07-01T00:00:00.000Z",
        now,
      })
    ).toEqual({ outcome: null, derived: false })
  })

  it("stays undecided with no due date", () => {
    expect(
      resolveEffectiveBidOutcome({
        bidOutcome: null,
        dueAt: null,
        now,
      })
    ).toEqual({ outcome: null, derived: false })
  })
})

describe("isBidOverdue", () => {
  const now = new Date("2026-06-15T12:00:00.000Z")

  it("is true only when undecided and past due", () => {
    expect(
      isBidOverdue({
        bidOutcome: null,
        dueAt: "2026-06-01T00:00:00.000Z",
        now,
      })
    ).toBe(true)
    expect(
      isBidOverdue({
        bidOutcome: "lost",
        dueAt: "2026-06-01T00:00:00.000Z",
        now,
      })
    ).toBe(false)
  })
})

describe("isRfpBidOutcome", () => {
  it("accepts known outcomes", () => {
    expect(isRfpBidOutcome("won")).toBe(true)
    expect(isRfpBidOutcome("filled")).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import {
  isLowConfidenceRatePick,
  rankPricedBuys,
  RATE_PICK_LOW_CONFIDENCE_THRESHOLD,
  scoreContractPick,
  scoreOverlayPick,
} from "./rate-pick-confidence"

describe("scoreContractPick", () => {
  it("returns n/a when there is no priced buy", () => {
    expect(
      scoreContractPick({ pricedCount: 0, chosenBuy: null })
    ).toMatchObject({
      confidence: null,
      reason: "n/a",
      candidateCount: 0,
    })
  })

  it("scores a single priced hit as only_option", () => {
    expect(
      scoreContractPick({ pricedCount: 1, chosenBuy: 1500 })
    ).toMatchObject({
      confidence: 0.95,
      reason: "only_option",
      candidateCount: 1,
    })
  })

  it("scores cheapest-of-many above the HITL threshold", () => {
    const pick = scoreContractPick({
      pricedCount: 3,
      chosenBuy: 1000,
      secondBuy: 1200,
    })
    expect(pick.reason).toBe("cheapest_of_many")
    expect(pick.confidence).toBe(0.85)
    expect(isLowConfidenceRatePick(pick.confidence)).toBe(false)
  })

  it("flags near-ties below the HITL threshold", () => {
    const pick = scoreContractPick({
      pricedCount: 2,
      chosenBuy: 1000,
      secondBuy: 1015,
    })
    expect(pick.reason).toBe("near_tie")
    expect(pick.confidence).toBe(0.7)
    expect(isLowConfidenceRatePick(pick.confidence)).toBe(true)
    expect(RATE_PICK_LOW_CONFIDENCE_THRESHOLD).toBe(0.75)
  })
})

describe("scoreOverlayPick", () => {
  it("scores projected overlay as weak", () => {
    const pick = scoreOverlayPick({ mode: "projected", buyConfidence: null })
    expect(pick).toMatchObject({
      confidence: 0.6,
      reason: "projected_overlay",
    })
    expect(isLowConfidenceRatePick(pick.confidence)).toBe(true)
  })

  it("inherits buy confidence for markup (capped)", () => {
    expect(
      scoreOverlayPick({ mode: "markup", buyConfidence: 0.95 })
    ).toMatchObject({
      confidence: 0.9,
      reason: "markup_overlay",
    })
    expect(
      scoreOverlayPick({ mode: "markup", buyConfidence: 0.7 })
    ).toMatchObject({
      confidence: 0.7,
      reason: "markup_overlay",
    })
  })
})

describe("rankPricedBuys", () => {
  it("sorts priced totals and exposes second for near-tie", () => {
    expect(
      rankPricedBuys([
        { resolved_buy_total: 1500 },
        { resolved_buy_total: null },
        { resolved_buy_total: 1200 },
        { resolved_buy_total: 1100 },
      ])
    ).toEqual({
      pricedCount: 3,
      chosenBuy: 1100,
      secondBuy: 1200,
    })
  })
})

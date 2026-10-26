import { describe, expect, it } from "vitest"
import {
  aggregateMappingQuality,
  aggregateMarginImpact,
  aggregateRateCoverage,
  classifyRateCoverageCell,
} from "./ops-analytics-metrics"

describe("classifyRateCoverageCell", () => {
  it("classifies contract hits from Starboard buy metadata", () => {
    expect(
      classifyRateCoverageCell({
        outcome: "filled",
        metadata: {
          starboardHitId: "hit_1",
          resolvedBuyTotal: 1200,
        },
      })
    ).toBe("contract_hit")
  })

  it("classifies skips without a hit", () => {
    expect(
      classifyRateCoverageCell({
        outcome: "skipped",
        metadata: { reason: "No Starboard contract hits" },
      })
    ).toBe("skip")
  })

  it("classifies projected overlay as overlay-only before skip", () => {
    expect(
      classifyRateCoverageCell({
        outcome: "filled",
        metadata: {
          overlayRuleId: "rule_1",
          overlayRuleName: "Projected",
          overlayMode: "projected",
          sellTotal: 1500,
        },
      })
    ).toBe("overlay_only")
  })

  it("treats needs_human / error without hit as other", () => {
    expect(
      classifyRateCoverageCell({
        outcome: "needs_human",
        metadata: {},
      })
    ).toBe("other")
  })
})

describe("aggregateRateCoverage", () => {
  it("builds mix counts", () => {
    const result = aggregateRateCoverage([
      {
        outcome: "filled",
        metadata: { starboardHitId: "a", resolvedBuyTotal: 1 },
      },
      {
        outcome: "filled",
        metadata: { starboardHitId: "b", resolvedBuyTotal: 2 },
      },
      { outcome: "skipped", metadata: {} },
      {
        outcome: "filled",
        metadata: {
          overlayRuleId: "r",
          overlayRuleName: "P",
          overlayMode: "projected",
          sellTotal: 9,
        },
      },
    ])
    expect(result.laneCellCount).toBe(4)
    expect(result.contractHit).toBe(2)
    expect(result.skip).toBe(1)
    expect(result.overlayOnly).toBe(1)
    expect(result.mix.map((b) => b.count)).toEqual([2, 1, 1, 0])
  })
})

describe("aggregateMarginImpact", () => {
  it("counts floor breaches, markup/projected, and margin buckets", () => {
    const result = aggregateMarginImpact({
      floorBreachReviews: 3,
      cells: [
        {
          metadata: {
            overlayRuleId: "r1",
            overlayRuleName: "M",
            overlayMode: "markup",
            sellTotal: 110,
            marginPct: 8,
          },
        },
        {
          metadata: {
            overlayRuleId: "r2",
            overlayRuleName: "M2",
            overlayMode: "markup",
            sellTotal: 200,
            marginPct: 25,
          },
        },
        {
          metadata: {
            overlayRuleId: "r3",
            overlayRuleName: "P",
            overlayMode: "projected",
            sellTotal: 90,
          },
        },
        { metadata: {} },
      ],
    })
    expect(result.floorBreachReviews).toBe(3)
    expect(result.markupCells).toBe(2)
    expect(result.projectedCells).toBe(1)
    expect(result.marginPctBuckets.find((b) => b.key === "5_10")?.count).toBe(1)
    expect(
      result.marginPctBuckets.find((b) => b.key === "20_plus")?.count
    ).toBe(1)
  })
})

describe("aggregateMappingQuality", () => {
  it("computes confirmed vs agent-only pending and HITL correction rate", () => {
    const result = aggregateMappingQuality({
      confirmedLanes: 12,
      mapReviews: [
        { status: "pending", source: "mapper", decidedByUserId: null },
        { status: "pending", source: "mapper", decidedByUserId: null },
        { status: "approved", source: "mapper", decidedByUserId: "u1" },
        { status: "edited", source: "mapper", decidedByUserId: "u1" },
        { status: "edited", source: "manual", decidedByUserId: "u2" },
      ],
    })
    expect(result.confirmedLanes).toBe(12)
    expect(result.agentOnlyPending).toBe(2)
    expect(result.mapReviewsDecided).toBe(3)
    expect(result.hitlCorrections).toBe(2)
    expect(result.hitlCorrectionRate).toBeCloseTo(2 / 3)
    expect(result.resolutionSources.map((s) => s.key)).toEqual([
      "mapper",
      "manual",
    ])
  })

  it("returns null correction rate with no decided reviews", () => {
    const result = aggregateMappingQuality({
      confirmedLanes: 0,
      mapReviews: [
        { status: "pending", source: "mapper", decidedByUserId: null },
      ],
    })
    expect(result.hitlCorrectionRate).toBeNull()
  })
})

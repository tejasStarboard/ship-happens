import { describe, expect, it } from "vitest"
import {
  collectPendingBidPriorityLanes,
  compareLaneBidPriorityDesc,
  LANE_BID_PRIORITY_ATTENTION_SCORE,
  LANE_BID_PRIORITY_CRITICAL_SCORE,
  scoreLaneBidPriority,
  toFillReportCellViewsWithBidPriority,
} from "./lane-bid-priority"
import type { LanePriceAudit } from "./lane-price-audit"
import { MARGIN_FLOOR_REVIEW_SOURCE } from "../overlay/margin-floor.types"
import { RATE_PICK_REVIEW_SOURCE } from "./rate-pick-confidence"

function audit(partial: {
  laneId?: string | null
  hitId?: string | null
  buyTotal?: number | null
  overlayMode?: "projected" | "markup" | null
  margin?: number | null
  pickConfidence?: number | null
}): LanePriceAudit {
  const mode = partial.overlayMode ?? null
  return {
    laneId: partial.laneId ?? "lane_1",
    originLocode: "CNSHA",
    destLocode: "USLAX",
    equipmentType: "40HC",
    starboard: {
      channel: "contract",
      hitId: partial.hitId ?? null,
      carrier: partial.hitId ? "MSC" : null,
      buyTotal: partial.buyTotal ?? null,
      currency: "USD",
      surcharges: [],
      missReason: null,
      vendorRateDocId: null,
      vendorEmailUrl: null,
    },
    overlay: mode
      ? {
          ruleId: "ovr_1",
          ruleName: "Rule",
          mode,
          currency: "USD",
          markupPct: mode === "markup" ? 10 : null,
          markupAmount: null,
          projectedSell: mode === "projected" ? 1200 : null,
          sellTotal: 1200,
          margin: partial.margin ?? null,
          marginPct: null,
        }
      : null,
    pick: {
      confidence: partial.pickConfidence ?? null,
      reason: partial.pickConfidence == null ? "n/a" : "cheapest_of_many",
      candidateCount: partial.pickConfidence == null ? 0 : 2,
    },
  }
}

describe("scoreLaneBidPriority", () => {
  it("flags skips as needing attention", () => {
    const p = scoreLaneBidPriority({
      outcome: "skipped",
      audit: audit({ hitId: null, buyTotal: null }),
    })
    expect(p.factors).toContain("skip_or_miss")
    expect(p.score).toBeGreaterThanOrEqual(LANE_BID_PRIORITY_ATTENTION_SCORE)
    expect(p.tier).not.toBe("ok")
  })

  it("flags overlay-only and low confidence", () => {
    const p = scoreLaneBidPriority({
      outcome: "filled",
      audit: audit({
        hitId: null,
        buyTotal: null,
        overlayMode: "projected",
        pickConfidence: 0.6,
      }),
    })
    expect(p.factors).toEqual(
      expect.arrayContaining(["overlay_only", "low_pick_confidence"])
    )
    // 25 + 20 = 45 → attention (critical starts at 50)
    expect(p.score).toBe(45)
    expect(p.tier).toBe("attention")
  })

  it("raises score for open floor and rate-pick reviews", () => {
    const p = scoreLaneBidPriority({
      outcome: "filled",
      audit: audit({
        hitId: "hit_1",
        buyTotal: 1000,
        overlayMode: "markup",
        pickConfidence: 0.85,
      }),
      openFloorReview: true,
      openRatePickReview: true,
    })
    expect(p.factors).toEqual(
      expect.arrayContaining(["open_floor_review", "open_rate_pick_review"])
    )
    expect(p.score).toBeGreaterThanOrEqual(LANE_BID_PRIORITY_CRITICAL_SCORE)
  })

  it("marks a strong contract hit as ok", () => {
    const p = scoreLaneBidPriority({
      outcome: "filled",
      audit: audit({
        hitId: "hit_1",
        buyTotal: 1000,
        overlayMode: "markup",
        margin: 100,
        pickConfidence: 0.95,
      }),
    })
    expect(p.score).toBe(0)
    expect(p.tier).toBe("ok")
    expect(p.factors).toEqual(["strong_contract_hit"])
  })

  it("flags negative margin", () => {
    const p = scoreLaneBidPriority({
      outcome: "filled",
      audit: audit({
        hitId: "hit_1",
        buyTotal: 1000,
        overlayMode: "markup",
        margin: -50,
        pickConfidence: 0.9,
      }),
    })
    expect(p.factors).toContain("negative_margin")
    // Soft signal alone (15) stays below attention threshold
    expect(p.score).toBe(15)
    expect(p.tier).toBe("ok")
  })
})

describe("collectPendingBidPriorityLanes", () => {
  it("collects rate-pick and floor lane keys from pending reviews", () => {
    const pending = collectPendingBidPriorityLanes([
      {
        source: RATE_PICK_REVIEW_SOURCE,
        status: "pending",
        sourceMetadata: { laneKey: "lane_a" },
      },
      {
        source: MARGIN_FLOOR_REVIEW_SOURCE,
        status: "pending",
        proposal: { laneKey: "lane_b" },
      },
      {
        source: RATE_PICK_REVIEW_SOURCE,
        status: "confirmed",
        sourceMetadata: { laneKey: "lane_c" },
      },
    ])
    expect([...pending.ratePick]).toEqual(["lane_a"])
    expect([...pending.floor]).toEqual(["lane_b"])
  })
})

describe("toFillReportCellViewsWithBidPriority", () => {
  it("scores base cells and inherits onto fee cells", () => {
    const cells = toFillReportCellViewsWithBidPriority(
      [
        {
          id: "base_1",
          sheetName: "Rates",
          cellRef: "D3",
          rowIndex: 2,
          columnKey: "ocean",
          outcome: "skipped",
          value: null,
          reason: "no hit",
          metadata: {
            laneId: "lane_1",
            cellRole: "base",
            pickConfidence: null,
            pickConfidenceReason: "n/a",
            pickCandidateCount: 0,
          },
        },
        {
          id: "fee_1",
          sheetName: "Rates",
          cellRef: "E3",
          rowIndex: 2,
          columnKey: "thc",
          outcome: "filled",
          value: "50",
          reason: null,
          metadata: {
            laneId: "lane_1",
            cellRole: "fee",
            starboardHitId: "hit_fee",
            resolvedBuyTotal: 50,
            pickConfidence: 0.95,
            pickConfidenceReason: "only_option",
            pickCandidateCount: 1,
          },
        },
      ],
      []
    )
    expect(cells[0]?.bidPriority?.factors).toContain("skip_or_miss")
    expect(cells[1]?.bidPriority).toEqual(cells[0]?.bidPriority)
  })
})

describe("compareLaneBidPriorityDesc", () => {
  it("orders higher scores first", () => {
    const high = scoreLaneBidPriority({
      outcome: "error",
      audit: audit({}),
    })
    const low = scoreLaneBidPriority({
      outcome: "filled",
      audit: audit({
        hitId: "h",
        buyTotal: 1,
        overlayMode: "markup",
        pickConfidence: 0.95,
      }),
    })
    expect(compareLaneBidPriorityDesc(high, low)).toBeLessThan(0)
    expect(compareLaneBidPriorityDesc(low, high)).toBeGreaterThan(0)
  })
})

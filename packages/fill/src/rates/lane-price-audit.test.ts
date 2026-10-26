import { describe, expect, it } from "vitest"
import {
  buildRateAuditMetadata,
  lanePriceAuditFromMetadata,
  toFillReportCellView,
  withOverlayAuditMetadata,
} from "./lane-price-audit"
import type { MappedLane } from "./mapped-lane"

const lane: MappedLane = {
  laneId: "lane_1",
  originLocode: "CNSHA",
  destLocode: "USLAX",
  equipmentType: "40HC",
  sheetName: "Rates",
  rowIndex: 2,
  columnKey: "ocean_freight",
}

describe("lane-price-audit", () => {
  it("builds Starboard hit metadata for rate resolve", () => {
    const meta = buildRateAuditMetadata(
      lane,
      {
        id: "hit_1",
        carrier_name: "MSC",
        resolved_buy_total: 1500,
        resolved_currency: "USD",
        resolved_surcharges: [{ name: "BAF", amount: 50, currency: "USD" }],
      },
      null
    )
    expect(meta).toMatchObject({
      laneId: "lane_1",
      channel: "contract",
      starboardHitId: "hit_1",
      carrier: "MSC",
      resolvedBuyTotal: 1500,
      reason: null,
      pickConfidence: null,
      pickConfidenceReason: "n/a",
    })
  })

  it("builds miss metadata when no candidate", () => {
    const meta = buildRateAuditMetadata(
      lane,
      null,
      "No Starboard contract hits"
    )
    const audit = lanePriceAuditFromMetadata(meta)
    expect(audit.starboard.buyTotal).toBeNull()
    expect(audit.starboard.missReason).toBe("No Starboard contract hits")
    expect(audit.overlay).toBeNull()
    expect(audit.pick.confidence).toBeNull()
    expect(audit.pick.reason).toBe("n/a")
  })

  it("merges overlay markup onto rate metadata", () => {
    const base = buildRateAuditMetadata(
      lane,
      {
        id: "hit_1",
        carrier_name: "MSC",
        resolved_buy_total: 1000,
        resolved_currency: "USD",
      },
      null,
      { confidence: 0.95, reason: "only_option", candidateCount: 1 }
    )
    const meta = withOverlayAuditMetadata(base, {
      ruleId: "ovr_1",
      ruleName: "Default markup",
      mode: "markup",
      currency: "USD",
      markupPct: 5,
      markupAmount: 50,
      sellTotal: 1100,
      margin: 100,
      marginPct: 10,
      pick: { confidence: 0.9, reason: "markup_overlay", candidateCount: 0 },
    })
    const audit = lanePriceAuditFromMetadata(meta)
    expect(audit.starboard.hitId).toBe("hit_1")
    expect(audit.overlay).toMatchObject({
      ruleId: "ovr_1",
      mode: "markup",
      markupPct: 5,
      sellTotal: 1100,
    })
    expect(audit.pick).toMatchObject({
      confidence: 0.9,
      reason: "markup_overlay",
    })
  })

  it("maps a persisted cell row to FillReportCellView", () => {
    const view = toFillReportCellView({
      id: "fcel_1",
      sheetName: "Rates",
      cellRef: "D3",
      rowIndex: 2,
      columnKey: "ocean_freight",
      outcome: "filled",
      value: "1100",
      reason: null,
      metadata: withOverlayAuditMetadata(
        buildRateAuditMetadata(
          lane,
          {
            id: "hit_1",
            carrier_name: "MSC",
            resolved_buy_total: 1000,
            resolved_currency: "USD",
          },
          null,
          { confidence: 0.95, reason: "only_option", candidateCount: 1 }
        ),
        {
          ruleId: "ovr_1",
          ruleName: "Projected Asia",
          mode: "projected",
          currency: "USD",
          projectedSell: 1100,
          sellTotal: 1100,
          pick: {
            confidence: 0.6,
            reason: "projected_overlay",
            candidateCount: 0,
          },
        }
      ),
    })
    expect(view.audit.overlay?.mode).toBe("projected")
    expect(view.audit.starboard.channel).toBe("contract")
    expect(view.audit.pick.confidence).toBe(0.6)
    expect(view.audit.pick.reason).toBe("projected_overlay")
  })
})

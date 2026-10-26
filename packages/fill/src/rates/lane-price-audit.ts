/**
 * Per-row pricing provenance (SB-6668 + SB-7084 pick confidence).
 *
 * Writers persist these keys on `rfp_fill_report_cells.metadata`.
 * Readers normalize via {@link lanePriceAuditFromMetadata} for UI / CLI.
 *
 * Phase 3 fill resolve is contract-only (`channel: "contract"`).
 */

import type { MappedLane } from "./mapped-lane"
import type { ResolvedRateCandidate } from "./rate-ports"
import type { RatePickConfidenceReason } from "./rate-pick-confidence"

/** Mirrors `fill_cell_outcome` — kept local so this module stays browser-safe. */
export type FillAuditCellOutcome =
  "filled" | "skipped" | "needs_human" | "error"

export type StarboardRateChannel = "contract"

export type LaneStarboardAudit = {
  channel: StarboardRateChannel
  hitId: string | null
  carrier: string | null
  buyTotal: number | null
  currency: string | null
  surcharges: unknown[]
  /** Present on miss / error when Starboard did not yield a priced buy. */
  missReason: string | null
}

export type LaneOverlayMode = "projected" | "markup"

export type LaneOverlayAudit = {
  ruleId: string
  ruleName: string
  mode: LaneOverlayMode
  currency: string | null
  markupPct: number | null
  markupAmount: number | null
  projectedSell: number | null
  sellTotal: number | null
  margin: number | null
  marginPct: number | null
}

/** Documented pick confidence (or explicit n/a via null). */
export type LanePickConfidenceAudit = {
  confidence: number | null
  reason: RatePickConfidenceReason | null
  candidateCount: number | null
}

export type LanePriceAudit = {
  laneId: string | null
  originLocode: string | null
  destLocode: string | null
  equipmentType: string | null
  starboard: LaneStarboardAudit
  overlay: LaneOverlayAudit | null
  pick: LanePickConfidenceAudit
}

export type FillReportCellView = {
  id: string
  sheetName: string | null
  cellRef: string | null
  rowIndex: number | null
  columnKey: string | null
  outcome: FillAuditCellOutcome
  value: string | null
  reason: string | null
  audit: LanePriceAudit
}

export type FillReportView = {
  summary: string | null
  filledCount: number
  skippedCount: number
  needsHumanCount: number
  errorCount: number
  cells: FillReportCellView[]
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asOverlayMode(value: unknown): LaneOverlayMode | null {
  return value === "projected" || value === "markup" ? value : null
}

function asConfidenceReason(value: unknown): RatePickConfidenceReason | null {
  switch (value) {
    case "only_option":
    case "cheapest_of_many":
    case "near_tie":
    case "projected_overlay":
    case "markup_overlay":
    case "n/a":
      return value
    default:
      return null
  }
}

/** Merge pick-confidence keys onto a metadata bag. */
export function withPickConfidenceMetadata(
  metadata: Record<string, unknown>,
  pick: {
    confidence: number | null
    reason: RatePickConfidenceReason
    candidateCount: number
  }
): Record<string, unknown> {
  return {
    ...metadata,
    pickConfidence: pick.confidence,
    pickConfidenceReason: pick.reason,
    pickCandidateCount: pick.candidateCount,
  }
}

/** Metadata written by rate resolve (Starboard source or miss). */
export function buildRateAuditMetadata(
  lane: MappedLane,
  chosen: ResolvedRateCandidate | null,
  reason: string | null,
  pick?: {
    confidence: number | null
    reason: RatePickConfidenceReason
    candidateCount: number
  }
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    laneId: lane.laneId,
    channel: "contract" satisfies StarboardRateChannel,
    originLocode: lane.originLocode,
    destLocode: lane.destLocode,
    equipmentType: lane.equipmentType,
    surchargeSlots: lane.surchargeSlots ?? [],
    starboardHitId: chosen?.id ?? null,
    carrier: chosen?.carrier_name ?? null,
    resolvedBuyTotal: chosen?.resolved_buy_total ?? null,
    resolvedCurrency: chosen?.resolved_currency ?? null,
    resolvedSurcharges: chosen?.resolved_surcharges ?? [],
    reason,
  }
  if (!pick) {
    return withPickConfidenceMetadata(base, {
      confidence: null,
      reason: "n/a",
      candidateCount: 0,
    })
  }
  return withPickConfidenceMetadata(base, pick)
}

/** Merge overlay / markup provenance onto an existing cell metadata bag. */
export function withOverlayAuditMetadata(
  metadata: Record<string, unknown>,
  input: {
    ruleId: string
    ruleName: string
    mode: LaneOverlayMode
    currency: string | null
    markupPct?: number | null
    markupAmount?: number | null
    projectedSell?: number | null
    sellTotal: number
    margin?: number | null
    marginPct?: number | null
    pick?: {
      confidence: number | null
      reason: RatePickConfidenceReason
      candidateCount: number
    }
  }
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...metadata,
    overlayRuleId: input.ruleId,
    overlayRuleName: input.ruleName,
    overlayMode: input.mode,
    overlayCurrency: input.currency,
    markupPct: input.markupPct ?? null,
    markupAmount: input.markupAmount ?? null,
    projectedSell: input.projectedSell ?? null,
    sellTotal: input.sellTotal,
    margin: input.margin ?? null,
    marginPct: input.marginPct ?? null,
  }
  if (!input.pick) return next
  return withPickConfidenceMetadata(next, input.pick)
}

/** Normalize persisted cell metadata into a stable audit view. */
export function lanePriceAuditFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): LanePriceAudit {
  const meta = metadata ?? {}
  const mode = asOverlayMode(meta.overlayMode)
  const ruleId = asString(meta.overlayRuleId)
  const ruleName = asString(meta.overlayRuleName)

  const overlay: LaneOverlayAudit | null =
    mode && ruleId && ruleName
      ? {
          ruleId,
          ruleName,
          mode,
          currency: asString(meta.overlayCurrency),
          markupPct: asNumber(meta.markupPct),
          markupAmount: asNumber(meta.markupAmount),
          projectedSell: asNumber(meta.projectedSell),
          sellTotal: asNumber(meta.sellTotal),
          margin: asNumber(meta.margin),
          marginPct: asNumber(meta.marginPct),
        }
      : null

  const candidateCount = asNumber(meta.pickCandidateCount)

  return {
    laneId: asString(meta.laneId),
    originLocode: asString(meta.originLocode),
    destLocode: asString(meta.destLocode),
    equipmentType: asString(meta.equipmentType),
    starboard: {
      channel: "contract",
      hitId: asString(meta.starboardHitId),
      carrier: asString(meta.carrier),
      buyTotal: asNumber(meta.resolvedBuyTotal),
      currency: asString(meta.resolvedCurrency),
      surcharges: Array.isArray(meta.resolvedSurcharges)
        ? meta.resolvedSurcharges
        : [],
      missReason: asString(meta.reason),
    },
    overlay,
    pick: {
      confidence: asNumber(meta.pickConfidence),
      reason: asConfidenceReason(meta.pickConfidenceReason),
      candidateCount,
    },
  }
}

export function toFillReportCellView(row: {
  id: string
  sheetName: string | null
  cellRef: string | null
  rowIndex: number | null
  columnKey: string | null
  outcome: FillAuditCellOutcome
  value: string | null
  reason: string | null
  metadata: Record<string, unknown>
}): FillReportCellView {
  return {
    id: row.id,
    sheetName: row.sheetName,
    cellRef: row.cellRef,
    rowIndex: row.rowIndex,
    columnKey: row.columnKey,
    outcome: row.outcome,
    value: row.value,
    reason: row.reason,
    audit: lanePriceAuditFromMetadata(row.metadata),
  }
}

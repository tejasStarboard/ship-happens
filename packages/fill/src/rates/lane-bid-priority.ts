/**
 * Lane bid priority (SB-7092).
 *
 * Ranks mapped lanes for analyst attention from fill resolve + review signals
 * (hit / skip / overlay-only, pick confidence, floor & rate-pick waits).
 * Higher score = needs attention sooner. No Starboard portfolio / FI sell APIs.
 */

import { MARGIN_FLOOR_REVIEW_SOURCE } from "../overlay/margin-floor.types"
import {
  toFillReportCellView,
  type FillAuditCellOutcome,
  type FillReportCellView,
  type LanePriceAudit,
} from "./lane-price-audit"
import {
  isLowConfidenceRatePick,
  RATE_PICK_REVIEW_SOURCE,
} from "./rate-pick-confidence"

/** Same buckets as ops `classifyRateCoverageCell`, from a normalized audit. */
function coverageFromAudit(
  outcome: FillAuditCellOutcome,
  audit: LanePriceAudit
): "contract_hit" | "skip" | "overlay_only" | "other" {
  if (audit.overlay?.mode === "projected") return "overlay_only"
  if (audit.starboard.hitId != null || audit.starboard.buyTotal != null) {
    return "contract_hit"
  }
  if (outcome === "skipped") return "skip"
  return "other"
}

export type LaneBidPriorityFactor =
  | "error"
  | "skip_or_miss"
  | "needs_human"
  | "overlay_only"
  | "low_pick_confidence"
  | "open_rate_pick_review"
  | "open_floor_review"
  | "negative_margin"
  | "strong_contract_hit"

export type LaneBidPriorityTier = "critical" | "attention" | "ok"

export type LaneBidPriority = {
  /** 0–100; higher = bid / review sooner. */
  score: number
  tier: LaneBidPriorityTier
  factors: LaneBidPriorityFactor[]
}

export const LANE_BID_PRIORITY_FACTOR_LABEL: Record<
  LaneBidPriorityFactor,
  string
> = {
  error: "Resolve error",
  skip_or_miss: "Skip / no Starboard hit",
  needs_human: "Needs human",
  overlay_only: "Overlay-only (no buy)",
  low_pick_confidence: "Low pick confidence",
  open_rate_pick_review: "Open rate-pick review",
  open_floor_review: "Open floor-margin review",
  negative_margin: "Negative margin",
  strong_contract_hit: "Strong contract hit",
}

export const LANE_BID_PRIORITY_TIER_LABEL: Record<LaneBidPriorityTier, string> =
  {
    critical: "Critical",
    attention: "Attention",
    ok: "OK",
  }

/** Score ≥ this → critical tier. */
export const LANE_BID_PRIORITY_CRITICAL_SCORE = 50
/** Score ≥ this (and below critical) → attention tier. */
export const LANE_BID_PRIORITY_ATTENTION_SCORE = 25

const WEIGHT: Record<
  Exclude<LaneBidPriorityFactor, "strong_contract_hit">,
  number
> = {
  error: 40,
  skip_or_miss: 35,
  needs_human: 30,
  overlay_only: 25,
  open_floor_review: 30,
  open_rate_pick_review: 20,
  low_pick_confidence: 20,
  negative_margin: 15,
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function tierForScore(score: number): LaneBidPriorityTier {
  if (score >= LANE_BID_PRIORITY_CRITICAL_SCORE) return "critical"
  if (score >= LANE_BID_PRIORITY_ATTENTION_SCORE) return "attention"
  return "ok"
}

export function laneKeyFromAudit(
  audit: Pick<LanePriceAudit, "laneId">,
  sheetName: string | null,
  cellRef: string | null
): string {
  const laneId = audit.laneId?.trim()
  if (laneId) return laneId
  return `${sheetName ?? ""}:${cellRef ?? ""}`
}

/**
 * Collect pending HITL lane keys that raise bid priority.
 * Accepts review rows with or without an explicit status (caller may pre-filter).
 */
export function collectPendingBidPriorityLanes(
  reviews: ReadonlyArray<{
    source: string | null | undefined
    status?: string | null
    sourceMetadata?: Record<string, unknown> | null
    proposal?: Record<string, unknown> | null
  }>
): { ratePick: Set<string>; floor: Set<string> } {
  const ratePick = new Set<string>()
  const floor = new Set<string>()
  for (const review of reviews) {
    if (review.status != null && review.status !== "pending") continue
    const fromMeta = review.sourceMetadata?.laneKey
    const fromProposal = review.proposal?.laneKey ?? review.proposal?.laneId
    const key =
      typeof fromMeta === "string" && fromMeta.trim()
        ? fromMeta.trim()
        : typeof fromProposal === "string" && fromProposal.trim()
          ? fromProposal.trim()
          : null
    if (!key) continue
    if (review.source === RATE_PICK_REVIEW_SOURCE) ratePick.add(key)
    if (review.source === MARGIN_FLOOR_REVIEW_SOURCE) floor.add(key)
  }
  return { ratePick, floor }
}

/**
 * Documented priority for one lane/cell from resolve + optional open reviews.
 */
export function scoreLaneBidPriority(input: {
  outcome: FillAuditCellOutcome
  audit: LanePriceAudit
  openRatePickReview?: boolean
  openFloorReview?: boolean
}): LaneBidPriority {
  const factors: LaneBidPriorityFactor[] = []
  let score = 0

  if (input.outcome === "error") {
    factors.push("error")
    score += WEIGHT.error
  } else if (input.outcome === "needs_human") {
    factors.push("needs_human")
    score += WEIGHT.needs_human
  }

  const coverage = coverageFromAudit(input.outcome, input.audit)

  if (coverage === "skip") {
    factors.push("skip_or_miss")
    score += WEIGHT.skip_or_miss
  } else if (coverage === "overlay_only") {
    factors.push("overlay_only")
    score += WEIGHT.overlay_only
  } else if (
    coverage === "other" &&
    input.audit.starboard.hitId == null &&
    input.audit.starboard.buyTotal == null &&
    (input.outcome === "skipped" || input.outcome === "error")
  ) {
    // Miss without explicit skip classification (e.g. error path).
    if (!factors.includes("error")) {
      factors.push("skip_or_miss")
      score += WEIGHT.skip_or_miss
    }
  }

  if (isLowConfidenceRatePick(input.audit.pick.confidence)) {
    factors.push("low_pick_confidence")
    score += WEIGHT.low_pick_confidence
  }

  if (input.openFloorReview) {
    factors.push("open_floor_review")
    score += WEIGHT.open_floor_review
  }
  if (input.openRatePickReview) {
    factors.push("open_rate_pick_review")
    score += WEIGHT.open_rate_pick_review
  }

  const margin = input.audit.overlay?.margin
  if (margin != null && Number.isFinite(margin) && margin < 0) {
    factors.push("negative_margin")
    score += WEIGHT.negative_margin
  }

  const clamped = clampScore(score)
  if (
    clamped === 0 &&
    coverage === "contract_hit" &&
    !input.openFloorReview &&
    !input.openRatePickReview &&
    !isLowConfidenceRatePick(input.audit.pick.confidence)
  ) {
    factors.push("strong_contract_hit")
  }

  return {
    score: clamped,
    tier: tierForScore(clamped),
    factors,
  }
}

function cellRoleFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): "base" | "fee" | null {
  const role = metadata?.cellRole
  if (role === "base" || role === "fee") return role
  return null
}

/** Sort comparator: higher score first, then critical > attention > ok. */
export function compareLaneBidPriorityDesc(
  a: LaneBidPriority | null | undefined,
  b: LaneBidPriority | null | undefined
): number {
  const scoreA = a?.score ?? -1
  const scoreB = b?.score ?? -1
  if (scoreB !== scoreA) return scoreB - scoreA
  const tierRank = { critical: 2, attention: 1, ok: 0 } as const
  const ta = a ? tierRank[a.tier] : -1
  const tb = b ? tierRank[b.tier] : -1
  return tb - ta
}

/**
 * Map fill-report rows → views with bidPriority.
 * Base cells are scored; fee cells inherit the same lane's base priority when present.
 */
export function toFillReportCellViewsWithBidPriority(
  rows: ReadonlyArray<{
    id: string
    sheetName: string | null
    cellRef: string | null
    rowIndex: number | null
    columnKey: string | null
    outcome: FillAuditCellOutcome
    value: string | null
    reason: string | null
    metadata: Record<string, unknown>
  }>,
  pendingReviews: ReadonlyArray<{
    source: string | null | undefined
    status?: string | null
    sourceMetadata?: Record<string, unknown> | null
    proposal?: Record<string, unknown> | null
  }> = []
): FillReportCellView[] {
  const pending = collectPendingBidPriorityLanes(pendingReviews)
  const views = rows.map((row) => toFillReportCellView(row))
  const roles = rows.map((row) => cellRoleFromMetadata(row.metadata))

  const priorityByLaneKey = new Map<string, LaneBidPriority>()

  for (let i = 0; i < views.length; i++) {
    const view = views[i]!
    const role = roles[i]
    if (role === "fee") continue
    const key = laneKeyFromAudit(view.audit, view.sheetName, view.cellRef)
    const priority = scoreLaneBidPriority({
      outcome: view.outcome,
      audit: view.audit,
      openRatePickReview: pending.ratePick.has(key),
      openFloorReview: pending.floor.has(key),
    })
    priorityByLaneKey.set(key, priority)
    views[i] = { ...view, bidPriority: priority }
  }

  for (let i = 0; i < views.length; i++) {
    const view = views[i]!
    if (view.bidPriority) continue
    const key = laneKeyFromAudit(view.audit, view.sheetName, view.cellRef)
    const inherited = priorityByLaneKey.get(key)
    if (inherited) {
      views[i] = { ...view, bidPriority: inherited }
      continue
    }
    views[i] = {
      ...view,
      bidPriority: scoreLaneBidPriority({
        outcome: view.outcome,
        audit: view.audit,
        openRatePickReview: pending.ratePick.has(key),
        openFloorReview: pending.floor.has(key),
      }),
    }
  }

  return views
}

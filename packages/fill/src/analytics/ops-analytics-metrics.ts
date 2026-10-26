/**
 * Pure classifiers for ops analytics (rate / margin / mapping / bid conversion).
 * Kept browser-safe — no DB imports.
 */

import { lanePriceAuditFromMetadata } from "../rates/lane-price-audit"
import {
  isRfpBidOutcome,
  resolveEffectiveBidOutcome,
  type RfpBidOutcome,
} from "../rfp/fill-bid-outcome"
import type {
  OpsAnalyticsAgingBucket,
  OpsAnalyticsBidConversion,
  OpsAnalyticsMarginImpact,
  OpsAnalyticsMappingQuality,
  OpsAnalyticsNamedCount,
  OpsAnalyticsRateCoverage,
} from "./ops-analytics.types"

export type RateCoverageClass =
  "contract_hit" | "skip" | "overlay_only" | "other"

export const RATE_COVERAGE_MIX: ReadonlyArray<{
  key: RateCoverageClass
  label: string
}> = [
  { key: "contract_hit", label: "Contract hit" },
  { key: "skip", label: "Skip" },
  { key: "overlay_only", label: "Overlay-only" },
  { key: "other", label: "Other" },
] as const

export const MARGIN_PCT_BUCKETS = [
  { key: "neg", label: "< 0%", min: -Infinity, max: 0 },
  { key: "0_5", label: "0–5%", min: 0, max: 5 },
  { key: "5_10", label: "5–10%", min: 5, max: 10 },
  { key: "10_20", label: "10–20%", min: 10, max: 20 },
  { key: "20_plus", label: "20%+", min: 20, max: Infinity },
] as const

export function classifyRateCoverageCell(input: {
  outcome: string
  metadata: Record<string, unknown> | null | undefined
}): RateCoverageClass {
  const audit = lanePriceAuditFromMetadata(input.metadata)
  if (audit.overlay?.mode === "projected") return "overlay_only"
  if (audit.starboard.hitId != null || audit.starboard.buyTotal != null) {
    return "contract_hit"
  }
  if (input.outcome === "skipped") return "skip"
  return "other"
}

export function emptyRateCoverage(): OpsAnalyticsRateCoverage {
  return {
    laneCellCount: 0,
    contractHit: 0,
    skip: 0,
    overlayOnly: 0,
    other: 0,
    mix: RATE_COVERAGE_MIX.map((b) => ({ ...b, count: 0 })),
  }
}

export function aggregateRateCoverage(
  cells: Array<{
    outcome: string
    metadata: Record<string, unknown> | null | undefined
  }>
): OpsAnalyticsRateCoverage {
  const counts: Record<RateCoverageClass, number> = {
    contract_hit: 0,
    skip: 0,
    overlay_only: 0,
    other: 0,
  }
  for (const cell of cells) {
    counts[classifyRateCoverageCell(cell)] += 1
  }
  return {
    laneCellCount: cells.length,
    contractHit: counts.contract_hit,
    skip: counts.skip,
    overlayOnly: counts.overlay_only,
    other: counts.other,
    mix: RATE_COVERAGE_MIX.map((b) => ({
      key: b.key,
      label: b.label,
      count: counts[b.key],
    })),
  }
}

function marginPctBucketKey(marginPct: number): string {
  const bucket =
    MARGIN_PCT_BUCKETS.find((b) => marginPct >= b.min && marginPct < b.max) ??
    MARGIN_PCT_BUCKETS[MARGIN_PCT_BUCKETS.length - 1]!
  return bucket.key
}

export function emptyMarginImpact(): OpsAnalyticsMarginImpact {
  return {
    floorBreachReviews: 0,
    markupCells: 0,
    projectedCells: 0,
    marginPctBuckets: MARGIN_PCT_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: 0,
    })),
  }
}

export function aggregateMarginImpact(input: {
  cells: Array<{ metadata: Record<string, unknown> | null | undefined }>
  floorBreachReviews: number
}): OpsAnalyticsMarginImpact {
  let markupCells = 0
  let projectedCells = 0
  const bucketCounts = Object.fromEntries(
    MARGIN_PCT_BUCKETS.map((b) => [b.key, 0])
  ) as Record<string, number>

  for (const cell of input.cells) {
    const audit = lanePriceAuditFromMetadata(cell.metadata)
    if (!audit.overlay) continue
    if (audit.overlay.mode === "markup") {
      markupCells += 1
      if (audit.overlay.marginPct != null) {
        const key = marginPctBucketKey(audit.overlay.marginPct)
        bucketCounts[key] = (bucketCounts[key] ?? 0) + 1
      }
    } else if (audit.overlay.mode === "projected") {
      projectedCells += 1
    }
  }

  return {
    floorBreachReviews: input.floorBreachReviews,
    markupCells,
    projectedCells,
    marginPctBuckets: MARGIN_PCT_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: bucketCounts[b.key] ?? 0,
    })),
  }
}

const RESOLUTION_SOURCE_LABEL: Record<string, string> = {
  mapper: "Mapper / agent",
  manual: "Manual",
  jev: "Jev",
  agent: "Agent",
}

export function labelResolutionSource(source: string | null | undefined): {
  key: string
  label: string
} {
  const raw = (source ?? "").trim().toLowerCase()
  if (!raw) return { key: "unknown", label: "Unknown" }
  return {
    key: raw,
    label: RESOLUTION_SOURCE_LABEL[raw] ?? source!.trim(),
  }
}

export function emptyMappingQuality(): OpsAnalyticsMappingQuality {
  return {
    confirmedLanes: 0,
    agentOnlyPending: 0,
    mapReviewsDecided: 0,
    hitlCorrections: 0,
    hitlCorrectionRate: null,
    resolutionSources: [],
  }
}

export function aggregateMappingQuality(input: {
  confirmedLanes: number
  mapReviews: Array<{
    status: string
    source: string | null
    decidedByUserId: string | null
  }>
}): OpsAnalyticsMappingQuality {
  let agentOnlyPending = 0
  let mapReviewsDecided = 0
  let hitlCorrections = 0
  const sourceCounts = new Map<string, OpsAnalyticsNamedCount>()

  for (const review of input.mapReviews) {
    const labeled = labelResolutionSource(review.source)
    const prev = sourceCounts.get(labeled.key)
    if (prev) prev.count += 1
    else sourceCounts.set(labeled.key, { ...labeled, count: 1 })

    if (review.status === "pending") {
      agentOnlyPending += 1
      continue
    }
    mapReviewsDecided += 1
    if (review.status === "edited") hitlCorrections += 1
  }

  return {
    confirmedLanes: input.confirmedLanes,
    agentOnlyPending,
    mapReviewsDecided,
    hitlCorrections,
    hitlCorrectionRate:
      mapReviewsDecided > 0 ? hitlCorrections / mapReviewsDecided : null,
    resolutionSources: [...sourceCounts.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label)
    ),
  }
}

export const BID_OUTCOME_MIX: ReadonlyArray<{
  key: RfpBidOutcome
  label: string
}> = [
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "closed", label: "Closed" },
  { key: "expired", label: "Expired" },
] as const

export const BID_DUE_AGING_BUCKETS = [
  { key: "lt_1d", label: "< 1 day overdue", maxHours: 24 },
  { key: "1_3d", label: "1–3 days overdue", maxHours: 72 },
  { key: "3_7d", label: "3–7 days overdue", maxHours: 168 },
  { key: "gt_7d", label: "7+ days overdue", maxHours: Infinity },
] as const

export function emptyBidConversion(): OpsAnalyticsBidConversion {
  return {
    decidedCount: 0,
    won: 0,
    lost: 0,
    closed: 0,
    expired: 0,
    winRate: null,
    outcomeMix: BID_OUTCOME_MIX.map((b) => ({ ...b, count: 0 })),
    dueAging: {
      withDue: 0,
      overdue: 0,
      buckets: BID_DUE_AGING_BUCKETS.map((b) => ({
        key: b.key,
        label: b.label,
        count: 0,
      })),
    },
  }
}

/** Win rate excludes closed/expired from the denominator. */
export function computeWinRate(won: number, lost: number): number | null {
  const denom = won + lost
  if (denom <= 0) return null
  return won / denom
}

export function aggregateBidConversion(input: {
  /** Fills decided in the analytics window (`decided_at` in range). */
  decided: Array<{ bidOutcome: string | null }>
  /** All org fills with a due date still open for aging (undecided). */
  dueRows: Array<{
    dueAt: Date | string
    bidOutcome: string | null
  }>
  now?: Date
}): OpsAnalyticsBidConversion {
  const now = input.now ?? new Date()
  const counts: Record<RfpBidOutcome, number> = {
    won: 0,
    lost: 0,
    closed: 0,
    expired: 0,
  }

  for (const row of input.decided) {
    if (isRfpBidOutcome(row.bidOutcome)) {
      counts[row.bidOutcome] += 1
    }
  }

  const agingCounts = Object.fromEntries(
    BID_DUE_AGING_BUCKETS.map((b) => [b.key, 0])
  ) as Record<string, number>
  let withDue = 0
  let overdue = 0

  for (const row of input.dueRows) {
    const stored = isRfpBidOutcome(row.bidOutcome) ? row.bidOutcome : null
    if (stored != null) continue
    withDue += 1
    const effective = resolveEffectiveBidOutcome({
      bidOutcome: null,
      dueAt: row.dueAt,
      now,
    })
    if (effective.outcome !== "expired") continue
    overdue += 1
    const due = typeof row.dueAt === "string" ? new Date(row.dueAt) : row.dueAt
    const ageHours = (now.getTime() - due.getTime()) / (1000 * 60 * 60)
    const bucket =
      BID_DUE_AGING_BUCKETS.find((b) => ageHours < b.maxHours) ??
      BID_DUE_AGING_BUCKETS[BID_DUE_AGING_BUCKETS.length - 1]!
    agingCounts[bucket.key] = (agingCounts[bucket.key] ?? 0) + 1
  }

  const decidedCount = counts.won + counts.lost + counts.closed + counts.expired

  return {
    decidedCount,
    won: counts.won,
    lost: counts.lost,
    closed: counts.closed,
    expired: counts.expired,
    winRate: computeWinRate(counts.won, counts.lost),
    outcomeMix: BID_OUTCOME_MIX.map((b) => ({
      key: b.key,
      label: b.label,
      count: counts[b.key],
    })),
    dueAging: {
      withDue,
      overdue,
      buckets: BID_DUE_AGING_BUCKETS.map((b): OpsAnalyticsAgingBucket => ({
        key: b.key,
        label: b.label,
        count: agingCounts[b.key] ?? 0,
      })),
    },
  }
}

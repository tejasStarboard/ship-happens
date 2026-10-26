/**
 * Pure classifiers for SB-7086 analytics (rate coverage, margins, mapping).
 * Kept browser-safe — no DB imports.
 */

import { lanePriceAuditFromMetadata } from "../rates/lane-price-audit"
import type {
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

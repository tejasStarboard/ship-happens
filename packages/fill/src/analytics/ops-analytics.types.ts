export type OpsAnalyticsStatusBucket = {
  status: string
  label: string
  count: number
}

export type OpsAnalyticsAgingBucket = {
  key: string
  label: string
  count: number
}

export type OpsAnalyticsFailureReason = {
  reason: string
  count: number
}

export type OpsAnalyticsMilestoneCount = {
  type: string
  label: string
  count: number
}

/** Named count bucket used by rate / margin / mapping sections. */
export type OpsAnalyticsNamedCount = {
  key: string
  label: string
  count: number
}

/**
 * Contract fill coverage (spot is not in the fill resolve path yet).
 * `laneCellCount` is the denominator for the mix.
 */
export type OpsAnalyticsRateCoverage = {
  laneCellCount: number
  contractHit: number
  skip: number
  overlayOnly: number
  other: number
  mix: OpsAnalyticsNamedCount[]
}

/** Floor breaches + overlay/markup impact from cells + margin-floor reviews. */
export type OpsAnalyticsMarginImpact = {
  floorBreachReviews: number
  markupCells: number
  projectedCells: number
  marginPctBuckets: OpsAnalyticsNamedCount[]
}

/**
 * Mapping quality proxies until LOCODE resolution-source is instrumented.
 * Agent-only = pending map-step proposals (not yet human-confirmed).
 */
export type OpsAnalyticsMappingQuality = {
  confirmedLanes: number
  agentOnlyPending: number
  mapReviewsDecided: number
  hitlCorrections: number
  /** edited / decided map reviews; null when no decided reviews. */
  hitlCorrectionRate: number | null
  resolutionSources: OpsAnalyticsNamedCount[]
}

export type OpsAnalyticsView = {
  /** Rolling window used for aggregates (days). */
  windowDays: number
  windowStartedAt: string
  fillCount: number
  statusFunnel: OpsAnalyticsStatusBucket[]
  /** Milliseconds; null when fewer than 2 done fills with timestamps. */
  timeToDoneMs: {
    sampleSize: number
    p50: number | null
    p90: number | null
  }
  openReviewAging: {
    totalPending: number
    buckets: OpsAnalyticsAgingBucket[]
  }
  topFailureReasons: OpsAnalyticsFailureReason[]
  /** Event counts in-window (may be sparse until fills emit forward). */
  lifecycleEvents: OpsAnalyticsMilestoneCount[]
  rateCoverage: OpsAnalyticsRateCoverage
  marginImpact: OpsAnalyticsMarginImpact
  mappingQuality: OpsAnalyticsMappingQuality
}

export const OPS_ANALYTICS_DEFAULT_WINDOW_DAYS = 30

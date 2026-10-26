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
}

export const OPS_ANALYTICS_DEFAULT_WINDOW_DAYS = 30

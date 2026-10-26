import { and, eq, gte, sql } from "drizzle-orm"
import { fillPipelineEvents, rfpReviewItems, rfps } from "@workspace/db"
import { FILL_PIPELINE_EVENT_TYPES } from "./fill-pipeline-events"
import {
  OPS_ANALYTICS_DEFAULT_WINDOW_DAYS,
  type OpsAnalyticsView,
} from "./ops-analytics.types"
import type { AppDb } from "../rfp/rfp.repository"

const STATUS_ORDER = [
  "queued",
  "running",
  "needs_review",
  "done",
  "failed",
  "cancelled",
] as const

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Needs review",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
}

const EVENT_LABEL: Record<string, string> = {
  "intake.completed": "Intake",
  "mapping.confirmed": "Mapping confirmed",
  "rates.completed": "Rates",
  "review.resolved": "Review resolved",
  "export.signed_off": "Export signed off",
}

const AGING_BUCKETS = [
  { key: "lt_1d", label: "< 1 day", maxHours: 24 },
  { key: "1_3d", label: "1–3 days", maxHours: 72 },
  { key: "3_7d", label: "3–7 days", maxHours: 168 },
  { key: "gt_7d", label: "7+ days", maxHours: Infinity },
] as const

function normalizeFailureReason(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\s+/g, " ")
  if (!trimmed) return "Unknown failure"
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
}

function percentileSorted(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0]!
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]!
  const w = idx - lo
  return sorted[lo]! * (1 - w) + sorted[hi]! * w
}

/**
 * Org-scoped ops analytics: funnel, time-to-done, review aging, failures.
 * Funnel/TTD/aging/failures read live fill + review rows (works without events).
 * Lifecycle event counts come from `fill_pipeline_events` (forward-filled).
 */
export class OpsAnalyticsService {
  constructor(private readonly db: AppDb) {}

  async getOrgOpsAnalytics(
    organizationId: string,
    options?: { windowDays?: number }
  ): Promise<OpsAnalyticsView> {
    const windowDays = options?.windowDays ?? OPS_ANALYTICS_DEFAULT_WINDOW_DAYS
    const windowStartedAt = new Date(
      Date.now() - windowDays * 24 * 60 * 60 * 1000
    )

    const [
      statusFunnel,
      timeToDoneMs,
      openReviewAging,
      topFailureReasons,
      lifecycleEvents,
      fillCountRow,
    ] = await Promise.all([
      this.statusFunnel(organizationId, windowStartedAt),
      this.timeToDone(organizationId, windowStartedAt),
      this.openReviewAging(organizationId),
      this.topFailureReasons(organizationId, windowStartedAt),
      this.lifecycleEventCounts(organizationId, windowStartedAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(rfps)
        .where(
          and(
            eq(rfps.organizationId, organizationId),
            gte(rfps.createdAt, windowStartedAt)
          )
        )
        .then((rows) => rows[0]?.count ?? 0),
    ])

    return {
      windowDays,
      windowStartedAt: windowStartedAt.toISOString(),
      fillCount: Number(fillCountRow),
      statusFunnel,
      timeToDoneMs,
      openReviewAging,
      topFailureReasons,
      lifecycleEvents,
    }
  }

  private async statusFunnel(organizationId: string, since: Date) {
    const rows = await this.db
      .select({
        status: rfps.status,
        count: sql<number>`count(*)::int`,
      })
      .from(rfps)
      .where(
        and(eq(rfps.organizationId, organizationId), gte(rfps.createdAt, since))
      )
      .groupBy(rfps.status)

    const byStatus = new Map(
      rows.map((r) => [r.status, Number(r.count)] as const)
    )
    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABEL[status] ?? status,
      count: byStatus.get(status) ?? 0,
    }))
  }

  private async timeToDone(organizationId: string, since: Date) {
    const rows = await this.db
      .select({
        startedAt: rfps.startedAt,
        completedAt: rfps.completedAt,
        createdAt: rfps.createdAt,
      })
      .from(rfps)
      .where(
        and(
          eq(rfps.organizationId, organizationId),
          eq(rfps.status, "done"),
          gte(rfps.completedAt, since)
        )
      )

    const durations: number[] = []
    for (const row of rows) {
      const end = row.completedAt
      if (!end) continue
      const start = row.startedAt ?? row.createdAt
      const ms = end.getTime() - start.getTime()
      if (ms >= 0) durations.push(ms)
    }
    durations.sort((a, b) => a - b)

    return {
      sampleSize: durations.length,
      p50: percentileSorted(durations, 0.5),
      p90: percentileSorted(durations, 0.9),
    }
  }

  private async openReviewAging(organizationId: string) {
    const rows = await this.db
      .select({ createdAt: rfpReviewItems.createdAt })
      .from(rfpReviewItems)
      .where(
        and(
          eq(rfpReviewItems.organizationId, organizationId),
          eq(rfpReviewItems.status, "pending")
        )
      )

    const now = Date.now()
    const counts = Object.fromEntries(
      AGING_BUCKETS.map((b) => [b.key, 0])
    ) as Record<string, number>

    for (const row of rows) {
      const ageHours = (now - row.createdAt.getTime()) / (1000 * 60 * 60)
      const bucket =
        AGING_BUCKETS.find((b) => ageHours < b.maxHours) ??
        AGING_BUCKETS[AGING_BUCKETS.length - 1]!
      counts[bucket.key] = (counts[bucket.key] ?? 0) + 1
    }

    return {
      totalPending: rows.length,
      buckets: AGING_BUCKETS.map((b) => ({
        key: b.key,
        label: b.label,
        count: counts[b.key] ?? 0,
      })),
    }
  }

  private async topFailureReasons(organizationId: string, since: Date) {
    const rows = await this.db
      .select({
        errorMessage: rfps.errorMessage,
        count: sql<number>`count(*)::int`,
      })
      .from(rfps)
      .where(
        and(
          eq(rfps.organizationId, organizationId),
          eq(rfps.status, "failed"),
          gte(rfps.completedAt, since)
        )
      )
      .groupBy(rfps.errorMessage)

    const aggregated = new Map<string, number>()
    for (const row of rows) {
      const reason = normalizeFailureReason(row.errorMessage)
      aggregated.set(reason, (aggregated.get(reason) ?? 0) + Number(row.count))
    }

    return [...aggregated.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
      .slice(0, 8)
  }

  private async lifecycleEventCounts(organizationId: string, since: Date) {
    const rows = await this.db
      .select({
        type: fillPipelineEvents.type,
        count: sql<number>`count(*)::int`,
      })
      .from(fillPipelineEvents)
      .where(
        and(
          eq(fillPipelineEvents.organizationId, organizationId),
          gte(fillPipelineEvents.occurredAt, since)
        )
      )
      .groupBy(fillPipelineEvents.type)

    const byType = new Map(rows.map((r) => [r.type, Number(r.count)] as const))
    return FILL_PIPELINE_EVENT_TYPES.map((type) => ({
      type,
      label: EVENT_LABEL[type] ?? type,
      count: byType.get(type) ?? 0,
    }))
  }
}

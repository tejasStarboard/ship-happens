import { randomUUID } from "node:crypto"
import { and, asc, eq } from "drizzle-orm"
import {
  fillPipelineEvents,
  rfpLogs,
  rfpProgressSteps,
  rfpReviewItems,
  rfps,
} from "@workspace/db"
import {
  pipelineEventForStepDone,
  type FillPipelineEventType,
} from "../analytics/fill-pipeline-events"
import { DomainError } from "../errors"
import type { AppDb } from "../rfp/rfp.repository"

export const FILL_PROGRESS_STEPS = [
  { key: "ingest", label: "Ingest / parse", sortOrder: 0 },
  { key: "map", label: "Map columns", sortOrder: 1 },
  { key: "rates", label: "Rates resolved", sortOrder: 2 },
  { key: "overlay", label: "Overlay applied", sortOrder: 3 },
  { key: "review", label: "Review", sortOrder: 4 },
  { key: "export", label: "Export", sortOrder: 5 },
] as const

export type ProgressStepKey = (typeof FILL_PROGRESS_STEPS)[number]["key"]
export type ProgressStatus =
  "pending" | "running" | "done" | "failed" | "skipped"
export type LogLevel = "debug" | "info" | "warn" | "error"
export type RfpRunStatus =
  "queued" | "running" | "needs_review" | "done" | "failed" | "cancelled"

/** Detail written onto a step while open review waits block it. */
export const PROGRESS_WAIT_DETAIL = "Waiting on human review"

export function isProgressStepKey(value: string): value is ProgressStepKey {
  return FILL_PROGRESS_STEPS.some((step) => step.key === value)
}

function stepId() {
  return `step_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function logId() {
  return `log_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function eventId() {
  return `fpe_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

/**
 * Sole writer for fill progress steps, logs, lifecycle events, and RFP run status.
 * Agent tools and intake must go through this manager.
 */
export class FillPipelineManager {
  constructor(private readonly db: AppDb) {}

  async seedSteps(
    rfpId: string,
    options?: { ingestStatus?: ProgressStatus; ingestDetail?: string },
    tx: AppDb = this.db
  ) {
    const ingestStatus = options?.ingestStatus ?? "done"
    const now = new Date()

    await tx.insert(rfpProgressSteps).values(
      FILL_PROGRESS_STEPS.map((step) => {
        const isIngest = step.key === "ingest"
        return {
          id: stepId(),
          rfpId,
          key: step.key,
          label: step.label,
          sortOrder: step.sortOrder,
          status: isIngest ? ingestStatus : ("pending" as ProgressStatus),
          detail: isIngest ? (options?.ingestDetail ?? null) : null,
          startedAt: isIngest ? now : null,
          completedAt: isIngest && ingestStatus === "done" ? now : null,
        }
      })
    )

    if (ingestStatus === "done") {
      await this.appendPipelineEvent(
        {
          rfpId,
          type: "intake.completed",
          stepKey: "ingest",
          payload: { detail: options?.ingestDetail ?? null },
          occurredAt: now,
        },
        tx
      )
    }
  }

  async appendLog(
    input: {
      rfpId: string
      message: string
      level?: LogLevel
      stepKey?: string | null
      source?: string | null
      metadata?: Record<string, unknown>
    },
    tx: AppDb = this.db
  ) {
    await tx.insert(rfpLogs).values({
      id: logId(),
      rfpId: input.rfpId,
      message: input.message,
      level: input.level ?? "info",
      stepKey: input.stepKey ?? null,
      source: input.source ?? "intake",
      metadata: input.metadata ?? {},
    })
  }

  /**
   * Append a durable lifecycle event. Resolves `organizationId` from the fill.
   */
  async appendPipelineEvent(
    input: {
      rfpId: string
      type: FillPipelineEventType
      stepKey?: string | null
      reviewItemId?: string | null
      payload?: Record<string, unknown>
      occurredAt?: Date
      organizationId?: string
    },
    tx: AppDb = this.db
  ) {
    let organizationId = input.organizationId
    if (!organizationId) {
      const row = await tx
        .select({ organizationId: rfps.organizationId })
        .from(rfps)
        .where(eq(rfps.id, input.rfpId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
      if (!row) {
        throw new DomainError(`Fill not found: ${input.rfpId}`, "NOT_FOUND")
      }
      organizationId = row.organizationId
    }

    await tx.insert(fillPipelineEvents).values({
      id: eventId(),
      organizationId,
      rfpId: input.rfpId,
      type: input.type,
      stepKey: input.stepKey ?? null,
      reviewItemId: input.reviewItemId ?? null,
      payload: input.payload ?? {},
      occurredAt: input.occurredAt ?? new Date(),
    })
  }

  listSteps(rfpId: string) {
    return this.db
      .select()
      .from(rfpProgressSteps)
      .where(eq(rfpProgressSteps.rfpId, rfpId))
      .orderBy(asc(rfpProgressSteps.sortOrder))
  }

  listLogs(rfpId: string, options?: { limit?: number; level?: LogLevel }) {
    const filters = [eq(rfpLogs.rfpId, rfpId)]
    if (options?.level) {
      filters.push(eq(rfpLogs.level, options.level))
    }
    const query = this.db
      .select()
      .from(rfpLogs)
      .where(and(...filters))
      .orderBy(asc(rfpLogs.createdAt))
    if (options?.limit != null && options.limit > 0) {
      return query.limit(options.limit)
    }
    return query
  }

  async setRfpStatus(
    rfpId: string,
    status: RfpRunStatus,
    options?: { errorMessage?: string | null }
  ) {
    const now = new Date()
    const current = await this.db
      .select({ startedAt: rfps.startedAt })
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    const patch: {
      status: RfpRunStatus
      updatedAt: Date
      errorMessage?: string | null
      startedAt?: Date
      completedAt?: Date
    } = { status, updatedAt: now }

    if (options?.errorMessage !== undefined) {
      patch.errorMessage = options.errorMessage
    }
    // Only stamp startedAt the first time the fill becomes running.
    if (status === "running" && !current?.startedAt) {
      patch.startedAt = now
    }
    if (status === "done" || status === "failed" || status === "cancelled") {
      patch.completedAt = now
    }

    await this.db.update(rfps).set(patch).where(eq(rfps.id, rfpId))
  }

  async updateStep(
    rfpId: string,
    key: ProgressStepKey,
    status: ProgressStatus,
    detail?: string | null
  ) {
    const existing = await this.db
      .select({
        id: rfpProgressSteps.id,
        startedAt: rfpProgressSteps.startedAt,
      })
      .from(rfpProgressSteps)
      .where(
        and(eq(rfpProgressSteps.rfpId, rfpId), eq(rfpProgressSteps.key, key))
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!existing) {
      throw new DomainError(`Unknown progress step: ${key}`, "NOT_FOUND")
    }

    const now = new Date()
    const patch: {
      status: ProgressStatus
      detail: string | null
      updatedAt: Date
      startedAt?: Date
      completedAt?: Date | null
    } = {
      status,
      detail: detail ?? null,
      updatedAt: now,
    }

    if ((status === "running" || status === "done") && !existing.startedAt) {
      patch.startedAt = now
    }
    if (status === "running") {
      patch.completedAt = null
    }
    if (status === "done" || status === "failed" || status === "skipped") {
      patch.completedAt = now
    }

    await this.db
      .update(rfpProgressSteps)
      .set(patch)
      .where(eq(rfpProgressSteps.id, existing.id))

    if (status === "done") {
      const eventType = pipelineEventForStepDone(key)
      if (eventType) {
        await this.appendPipelineEvent({
          rfpId,
          type: eventType,
          stepKey: key,
          payload: { detail: detail ?? null },
          occurredAt: now,
        })
      }
    }
  }

  async hasOpenWaitsForStep(rfpId: string, key: ProgressStepKey) {
    const row = await this.db
      .select({ id: rfpReviewItems.id })
      .from(rfpReviewItems)
      .where(
        and(
          eq(rfpReviewItems.rfpId, rfpId),
          eq(rfpReviewItems.status, "pending"),
          eq(rfpReviewItems.stepKey, key)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
    return row != null
  }

  async startStep(rfpId: string, key: ProgressStepKey, detail?: string) {
    await this.updateStep(rfpId, key, "running", detail ?? null)
    await this.setRfpStatus(rfpId, "running")
    await this.appendLog({
      rfpId,
      stepKey: key,
      message: `Started step: ${key}`,
      source: "pipeline",
    })
  }

  async completeStep(rfpId: string, key: ProgressStepKey, detail?: string) {
    if (await this.hasOpenWaitsForStep(rfpId, key)) {
      throw new DomainError(
        `Cannot complete step "${key}" while open review waits exist`,
        "VALIDATION"
      )
    }
    await this.updateStep(rfpId, key, "done", detail ?? null)
    await this.appendLog({
      rfpId,
      stepKey: key,
      message: `Completed step: ${key}`,
      source: "pipeline",
    })
  }

  async failStep(rfpId: string, key: ProgressStepKey, message: string) {
    await this.updateStep(rfpId, key, "failed", message)
    await this.setRfpStatus(rfpId, "failed", { errorMessage: message })
    await this.appendLog({
      rfpId,
      stepKey: key,
      message,
      level: "error",
      source: "pipeline",
    })
  }
}

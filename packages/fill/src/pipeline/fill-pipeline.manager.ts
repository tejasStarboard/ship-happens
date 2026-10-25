import { randomUUID } from "node:crypto"
import { and, asc, eq } from "drizzle-orm"
import { rfpLogs, rfpProgressSteps, rfps } from "@workspace/db"
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

function stepId() {
  return `step_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function logId() {
  return `log_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

/**
 * Sole writer for fill progress steps, logs, and RFP run status.
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

  listSteps(rfpId: string) {
    return this.db
      .select()
      .from(rfpProgressSteps)
      .where(eq(rfpProgressSteps.rfpId, rfpId))
      .orderBy(asc(rfpProgressSteps.sortOrder))
  }

  listLogs(rfpId: string) {
    return this.db
      .select()
      .from(rfpLogs)
      .where(eq(rfpLogs.rfpId, rfpId))
      .orderBy(asc(rfpLogs.createdAt))
  }

  async setRfpStatus(
    rfpId: string,
    status: RfpRunStatus,
    options?: { errorMessage?: string | null }
  ) {
    const now = new Date()
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
    if (status === "running") {
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
    if (status === "done" || status === "failed" || status === "skipped") {
      patch.completedAt = now
    }

    await this.db
      .update(rfpProgressSteps)
      .set(patch)
      .where(eq(rfpProgressSteps.id, existing.id))
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
